import { rpc } from './api';
import type { PendingScore } from './storage';

export async function registerPlayer(username: string, secret: string): Promise<string> {
  const id = await rpc<unknown>('voltring_register_player', { p_username: username, p_secret: secret });
  if (typeof id !== 'string') throw new Error('invalid register response');
  return id;
}

export async function renamePlayer(playerId: string, secret: string, username: string): Promise<void> {
  await rpc('voltring_rename_player', { p_player_id: playerId, p_secret: secret, p_username: username });
}

export async function deletePlayer(playerId: string, secret: string): Promise<void> {
  await rpc('voltring_delete_player', { p_player_id: playerId, p_secret: secret });
}

export interface SubmitResult {
  best: number;
  rank: number | null;
}

export async function submitScore(playerId: string, secret: string, run: PendingScore): Promise<SubmitResult> {
  const body = await rpc<unknown>('voltring_submit_score', {
    p_player_id: playerId,
    p_secret: secret,
    p_run_id: run.runId,
    p_score: run.score,
    p_hits: run.hits,
    p_duration_ms: run.durationMs,
    p_max_combo: run.maxCombo,
  });
  const row = Array.isArray(body) ? body[0] : body;
  const best = Number((row as { best_score?: unknown } | null)?.best_score);
  const rank = Number((row as { rank?: unknown } | null)?.rank);
  return { best: Number.isFinite(best) ? best : run.score, rank: Number.isFinite(rank) ? rank : null };
}
