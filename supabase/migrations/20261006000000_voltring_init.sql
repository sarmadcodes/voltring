-- VOLTRING global leaderboard.
-- Design: one row per player. The table is fully closed by RLS (no policies), so the
-- public anon key cannot read or write it directly. All access goes through the
-- SECURITY DEFINER functions below, which validate input and authorise writes with a
-- per-install secret (only its SHA-256 hash is stored).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.voltring_players (
  id             uuid primary key default gen_random_uuid(),
  username       text not null,
  username_key   text not null unique,
  secret_hash    text not null,
  best_score     integer not null default 0 check (best_score >= 0),
  best_combo     integer not null default 0 check (best_combo >= 0),
  best_at        timestamptz,
  last_run_id    uuid,
  last_submit_at timestamptz,
  renamed_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Leaderboard order: higher score first, earlier achievement wins ties, id makes it total.
create index if not exists voltring_players_rank_idx
  on public.voltring_players (best_score desc, best_at asc, id asc)
  where best_score > 0;

-- RLS on with zero policies: anon/authenticated can never touch rows directly.
-- Deliberately NOT "force": the SECURITY DEFINER functions below run as the table owner
-- and must bypass RLS to do their (validated) work.
alter table public.voltring_players enable row level security;
revoke all on table public.voltring_players from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Helpers (not callable by clients)
-- ---------------------------------------------------------------------------

create or replace function public.voltring_valid_username(p_username text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select p_username is not null
    and p_username ~ '^[A-Za-z0-9_]{3,16}$'
    and lower(p_username) not in (
      'admin','administrator','moderator','mod','voltring','support','staff',
      'system','you','null','undefined','anonymous'
    );
$$;

-- Mirrors src/game/rules.ts maxScoreForHits: every hit perfect (x2) + golden (x3) with an unbroken combo.
create or replace function public.voltring_max_score_for_hits(p_hits integer)
returns bigint
language sql immutable
set search_path = ''
as $$
  select coalesce(sum((10 + least(i / 10, 20)) * 6 * least(1 + (i + 1) / 4, 8)), 0)::bigint
  from generate_series(0, greatest(p_hits, 0) - 1) as i;
$$;

create or replace function public.voltring_auth(p_player_id uuid, p_secret text)
returns public.voltring_players
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.voltring_players;
begin
  select * into v_row from public.voltring_players
  where id = p_player_id
    and secret_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  for update;
  if not found then
    raise exception 'UNAUTHORIZED';
  end if;
  return v_row;
end;
$$;

create or replace function public.voltring_rank_of(p_player_id uuid)
returns bigint
language sql stable
security definer
set search_path = ''
as $$
  select case when me.best_score > 0 then (
    select count(*) + 1 from public.voltring_players o
    where o.best_score > 0
      and (o.best_score > me.best_score
        or (o.best_score = me.best_score and (o.best_at, o.id) < (me.best_at, me.id)))
  ) end
  from public.voltring_players me where me.id = p_player_id;
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

create or replace function public.voltring_register_player(p_username text, p_secret text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.voltring_valid_username(p_username) then
    raise exception 'INVALID_USERNAME';
  end if;
  if p_secret is null or length(p_secret) < 32 or length(p_secret) > 128 then
    raise exception 'UNAUTHORIZED';
  end if;
  begin
    insert into public.voltring_players (username, username_key, secret_hash)
    values (p_username, lower(p_username), encode(extensions.digest(p_secret, 'sha256'), 'hex'))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'USERNAME_TAKEN';
  end;
  return v_id;
end;
$$;

create or replace function public.voltring_rename_player(p_player_id uuid, p_secret text, p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.voltring_players;
begin
  v_row := public.voltring_auth(p_player_id, p_secret);
  if not public.voltring_valid_username(p_username) then
    raise exception 'INVALID_USERNAME';
  end if;
  if lower(p_username) = v_row.username_key then
    -- Case-only change: allowed, does not consume the cooldown.
    update public.voltring_players set username = p_username, updated_at = now() where id = v_row.id;
    return;
  end if;
  if v_row.renamed_at is not null and v_row.renamed_at > now() - interval '24 hours' then
    raise exception 'RENAME_COOLDOWN';
  end if;
  begin
    update public.voltring_players
      set username = p_username, username_key = lower(p_username), renamed_at = now(), updated_at = now()
      where id = v_row.id;
  exception when unique_violation then
    raise exception 'USERNAME_TAKEN';
  end;
end;
$$;

create or replace function public.voltring_delete_player(p_player_id uuid, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.voltring_players;
begin
  v_row := public.voltring_auth(p_player_id, p_secret);
  delete from public.voltring_players where id = v_row.id;
end;
$$;

create or replace function public.voltring_submit_score(
  p_player_id uuid, p_secret text, p_run_id uuid,
  p_score integer, p_hits integer, p_duration_ms integer, p_max_combo integer
)
returns table (best_score integer, rank bigint)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_row public.voltring_players;
begin
  v_row := public.voltring_auth(p_player_id, p_secret);

  -- Same run re-sent (retry after a lost response, or a rewarded continue): idempotent unless it improved.
  if v_row.last_run_id is distinct from p_run_id
     and v_row.last_submit_at is not null
     and v_row.last_submit_at > now() - interval '5 seconds' then
    raise exception 'RATE_LIMITED';
  end if;

  if p_run_id is null
     or p_score is null or p_score < 0
     or p_hits is null or p_hits < 0 or p_hits > 20000
     or p_duration_ms is null or p_duration_ms < 0 or p_duration_ms > 4 * 60 * 60 * 1000
     or p_max_combo is null or p_max_combo < 0 or p_max_combo > p_hits
     or p_hits > p_duration_ms / 250 + 3
     or p_score > public.voltring_max_score_for_hits(p_hits) then
    raise exception 'SCORE_REJECTED';
  end if;

  if p_score > v_row.best_score then
    update public.voltring_players p
      set best_score = p_score,
          best_combo = greatest(p.best_combo, p_max_combo),
          best_at = now(),
          last_run_id = p_run_id,
          last_submit_at = now(),
          updated_at = now()
      where p.id = v_row.id;
  else
    update public.voltring_players p
      set last_run_id = p_run_id, last_submit_at = now()
      where p.id = v_row.id;
  end if;

  return query
    select p.best_score, public.voltring_rank_of(p.id)
    from public.voltring_players p where p.id = v_row.id;
end;
$$;

create or replace function public.voltring_get_leaderboard(p_player_id uuid default null, p_limit integer default 100)
returns json
language sql stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'top', coalesce((
      select json_agg(t order by t.rank)
      from (
        select row_number() over (order by p.best_score desc, p.best_at asc, p.id asc) as rank,
               p.username, p.best_score
        from public.voltring_players p
        where p.best_score > 0
        order by p.best_score desc, p.best_at asc, p.id asc
        limit least(greatest(coalesce(p_limit, 100), 1), 100)
      ) t
    ), '[]'::json),
    'me', (
      select json_build_object('rank', public.voltring_rank_of(p.id), 'username', p.username, 'best_score', p.best_score)
      from public.voltring_players p
      where p.id = p_player_id and p.best_score > 0
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges: Postgres grants EXECUTE to PUBLIC by default; lock everything down,
-- then expose only the five client RPCs to the anon role.
-- ---------------------------------------------------------------------------

revoke all on function public.voltring_valid_username(text) from public, anon, authenticated;
revoke all on function public.voltring_max_score_for_hits(integer) from public, anon, authenticated;
revoke all on function public.voltring_auth(uuid, text) from public, anon, authenticated;
revoke all on function public.voltring_rank_of(uuid) from public, anon, authenticated;
revoke all on function public.voltring_register_player(text, text) from public;
revoke all on function public.voltring_rename_player(uuid, text, text) from public;
revoke all on function public.voltring_delete_player(uuid, text) from public;
revoke all on function public.voltring_submit_score(uuid, text, uuid, integer, integer, integer, integer) from public;
revoke all on function public.voltring_get_leaderboard(uuid, integer) from public;

grant execute on function public.voltring_register_player(text, text) to anon, authenticated;
grant execute on function public.voltring_rename_player(uuid, text, text) to anon, authenticated;
grant execute on function public.voltring_delete_player(uuid, text) to anon, authenticated;
grant execute on function public.voltring_submit_score(uuid, text, uuid, integer, integer, integer, integer) to anon, authenticated;
grant execute on function public.voltring_get_leaderboard(uuid, integer) to anon, authenticated;
