// Exercises the migration in an in-process Postgres (PGlite) as a non-superuser owner, the
// same way Supabase runs it. Run: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';

const sql = readFileSync(process.argv[2], 'utf8');
const db = new PGlite({ extensions: { pgcrypto } });

// Recreate the bits of a Supabase project the migration relies on.
await db.exec(`
  create schema if not exists extensions;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  create role app_owner nologin nosuperuser nobypassrls;
  grant create, usage on schema public to app_owner;
  grant usage on schema extensions to app_owner, anon, authenticated;
  grant anon, authenticated to app_owner;
  grant app_owner to current_user;
`);
await db.exec('create extension if not exists pgcrypto with schema extensions');
await db.exec('set role app_owner');
await db.exec(sql.replace(/create extension[^;]*;/i, ''));
await db.exec('reset role');

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};
async function asAnon(q, params = []) {
  await db.exec('set role anon');
  try {
    return { rows: (await db.query(q, params)).rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec('reset role');
  }
}

const S1 = 'a'.repeat(64);
const S2 = 'b'.repeat(64);

// Registration
const r1 = await asAnon('select public.voltring_register_player($1,$2) as id', ['Neo_1', S1]);
ok('register valid player', r1.rows?.[0]?.id, r1.error);
const id1 = r1.rows[0].id;
const dup = await asAnon('select public.voltring_register_player($1,$2) as id', ['NEO_1', S2]);
ok('duplicate name is rejected case-insensitively', dup.error?.includes('USERNAME_TAKEN'), dup.error);
const bad = await asAnon('select public.voltring_register_player($1,$2) as id', ['bad name!', S2]);
ok('invalid name rejected', bad.error?.includes('INVALID_USERNAME'));
const reserved = await asAnon('select public.voltring_register_player($1,$2) as id', ['Admin', S2]);
ok('reserved name rejected', reserved.error?.includes('INVALID_USERNAME'));
const weak = await asAnon('select public.voltring_register_player($1,$2) as id', ['Trinity', 'short']);
ok('short secret rejected', weak.error?.includes('UNAUTHORIZED'));
const r2 = await asAnon('select public.voltring_register_player($1,$2) as id', ['Trinity', S2]);
const id2 = r2.rows[0].id;

// Direct table access is closed
const direct = await asAnon('select * from public.voltring_players');
ok('anon cannot read the table directly', !!direct.error, direct.error);
const directUpd = await asAnon('update public.voltring_players set best_score = 999999');
ok('anon cannot write the table directly', !!directUpd.error);
const helper = await asAnon('select public.voltring_max_score_for_hits(10)');
ok('internal helpers are not callable', !!helper.error);
const authHelper = await asAnon(`select public.voltring_auth('${id1}', '${S1}')`);
ok('auth helper is not callable', !!authHelper.error);

// Scores
const submit = (id, secret, run, score, hits, ms, combo) =>
  asAnon('select * from public.voltring_submit_score($1,$2,$3,$4,$5,$6,$7)', [id, secret, run, score, hits, ms, combo]);
const run1 = '00000000-0000-0000-0000-000000000001';
const s1 = await submit(id1, S1, run1, 500, 20, 30000, 12);
ok('valid score accepted', s1.rows?.[0]?.best_score === 500 && Number(s1.rows[0].rank) === 1, s1.error ?? JSON.stringify(s1.rows));
const again = await submit(id1, S1, run1, 500, 20, 30000, 12);
ok('re-sending the same run is idempotent (no rate limit)', again.rows?.[0]?.best_score === 500, again.error);
const wrongSecret = await submit(id1, S2, '00000000-0000-0000-0000-000000000002', 900, 20, 30000, 12);
ok("cannot submit to another player's row", wrongSecret.error?.includes('UNAUTHORIZED'));
const rate = await submit(id1, S1, '00000000-0000-0000-0000-000000000003', 600, 20, 30000, 12);
ok('rapid different-run submissions are rate limited', rate.error?.includes('RATE_LIMITED'), rate.error);

// Anti-cheat on player 2 (fresh rate window)
const impossible = await submit(id2, S2, '00000000-0000-0000-0000-000000000010', 100000, 10, 30000, 5);
ok('impossible score for hit count rejected', impossible.error?.includes('SCORE_REJECTED'));
await db.exec(`update public.voltring_players set last_submit_at = null where id = '${id2}'`);
const tooFast = await submit(id2, S2, '00000000-0000-0000-0000-000000000011', 100, 500, 10000, 5);
ok('too many hits for duration rejected', tooFast.error?.includes('SCORE_REJECTED'));
await db.exec(`update public.voltring_players set last_submit_at = null where id = '${id2}'`);
const comboCheat = await submit(id2, S2, '00000000-0000-0000-0000-000000000012', 100, 5, 10000, 50);
ok('combo larger than hits rejected', comboCheat.error?.includes('SCORE_REJECTED'));
await db.exec(`update public.voltring_players set last_submit_at = null where id = '${id2}'`);
const negative = await submit(id2, S2, '00000000-0000-0000-0000-000000000013', -5, 5, 10000, 1);
ok('negative score rejected', negative.error?.includes('SCORE_REJECTED'));
await db.exec(`update public.voltring_players set last_submit_at = null where id = '${id2}'`);
const s2 = await submit(id2, S2, '00000000-0000-0000-0000-000000000014', 500, 20, 30000, 12);
ok('tie score accepted', s2.rows?.[0]?.best_score === 500 && Number(s2.rows[0].rank) === 2, JSON.stringify(s2.rows ?? s2.error));
await db.exec(`update public.voltring_players set last_submit_at = null where id = '${id2}'`);
const lower = await submit(id2, S2, '00000000-0000-0000-0000-000000000015', 100, 20, 30000, 12);
ok('lower score never lowers the best', lower.rows?.[0]?.best_score === 500);

// Leaderboard
const lb = await asAnon('select public.voltring_get_leaderboard($1, 100) as data', [id2]);
const data = lb.rows?.[0]?.data;
ok('leaderboard returns ordered top list', data?.top?.length === 2 && data.top[0].username === 'Neo_1' && data.top[1].rank === 2, lb.error ?? JSON.stringify(data));
ok('leaderboard returns caller rank', data?.me?.rank === 2 && data.me.username === 'Trinity');
ok('leaderboard exposes no ids or secrets', !JSON.stringify(data).includes(id1) && !JSON.stringify(data).includes('secret'));
const lbAnon = await asAnon('select public.voltring_get_leaderboard(null, 5000) as data');
ok('leaderboard works without player id and caps limit', Array.isArray(lbAnon.rows?.[0]?.data?.top) && lbAnon.rows[0].data.me === null);

// Rename
const ren = await asAnon('select public.voltring_rename_player($1,$2,$3)', [id2, S2, 'Morpheus']);
ok('rename works', !ren.error, ren.error);
const ren2 = await asAnon('select public.voltring_rename_player($1,$2,$3)', [id2, S2, 'Oracle']);
ok('second rename within 24h blocked', ren2.error?.includes('RENAME_COOLDOWN'));
const renCase = await asAnon('select public.voltring_rename_player($1,$2,$3)', [id2, S2, 'MORPHEUS']);
ok('case-only rename allowed during cooldown', !renCase.error, renCase.error);
await db.exec(`update public.voltring_players set renamed_at = null where id = '${id2}'`);
const renTaken = await asAnon('select public.voltring_rename_player($1,$2,$3)', [id2, S2, 'neo_1']);
ok('rename to a taken name blocked', renTaken.error?.includes('USERNAME_TAKEN'));
const renOther = await asAnon('select public.voltring_rename_player($1,$2,$3)', [id1, S2, 'Hacker']);
ok("cannot rename another player", renOther.error?.includes('UNAUTHORIZED'));

// Delete
const delOther = await asAnon('select public.voltring_delete_player($1,$2)', [id1, S2]);
ok('cannot delete another player', delOther.error?.includes('UNAUTHORIZED'));
const del = await asAnon('select public.voltring_delete_player($1,$2)', [id2, S2]);
ok('player can delete own data', !del.error, del.error);
const after = await asAnon('select public.voltring_get_leaderboard(null, 100) as data');
ok('deleted player gone from leaderboard', after.rows[0].data.top.length === 1);

// Max score bound sanity vs client formula
const bound = await db.query('select public.voltring_max_score_for_hits(37) as b');
let t = 0;
for (let i = 0; i < 37; i++) t += (10 + Math.min(Math.floor(i / 10), 20)) * 6 * Math.min(1 + Math.floor((i + 1) / 4), 8);
ok('SQL max-score bound equals client formula', Number(bound.rows[0].b) === t, `${bound.rows[0].b} vs ${t}`);

// Query plan uses the rank index
const plan = await db.query(`explain select id from public.voltring_players where best_score > 0 order by best_score desc, best_at asc, id asc limit 100`);
console.log(plan.rows.map((r) => r['QUERY PLAN']).join('\n'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
