import { rpc } from './api';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

export interface LeaderboardData {
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function toEntry(v: unknown): LeaderboardEntry | null {
  if (!isObj(v)) return null;
  const rank = Number(v.rank);
  const score = Number(v.best_score);
  if (!Number.isFinite(rank) || !Number.isFinite(score) || typeof v.username !== 'string') return null;
  return { rank, username: v.username, score };
}

/** Server already orders; this re-sorts defensively so a malformed payload can't scramble the UI. */
export function sortEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => a.rank - b.rank || b.score - a.score || a.username.localeCompare(b.username));
}

export function parseLeaderboard(body: unknown): LeaderboardData {
  if (!isObj(body)) return { top: [], me: null };
  const top = Array.isArray(body.top) ? body.top.map(toEntry).filter((e): e is LeaderboardEntry => e !== null) : [];
  return { top: sortEntries(top), me: toEntry(body.me) };
}

export async function fetchLeaderboard(playerId: string | null): Promise<LeaderboardData> {
  const body = await rpc<unknown>('voltring_get_leaderboard', { p_player_id: playerId, p_limit: 100 });
  return parseLeaderboard(body);
}
