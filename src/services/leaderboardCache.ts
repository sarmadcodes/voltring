import { logError } from '@/lib/log';
import { getState, setState } from '@/state/store';

import { fetchLeaderboard, type LeaderboardData } from './leaderboard';

/** Minimum gap between network refreshes; re-opening the screen reuses the last result. */
const MIN_REFRESH_MS = 15_000;

let cache: { data: LeaderboardData; at: number } | null = null;
let inFlight: Promise<LeaderboardData> | null = null;

export function cachedLeaderboard(): LeaderboardData | null {
  return cache?.data ?? null;
}

/**
 * Loads the board, sharing one request between concurrent callers and throttling repeats.
 * Throws ApiError on failure so the screen can show the right message.
 */
export function loadLeaderboard(force = false): Promise<LeaderboardData> {
  if (inFlight) return inFlight;
  if (!force && cache && Date.now() - cache.at < MIN_REFRESH_MS) return Promise.resolve(cache.data);
  inFlight = (async () => {
    try {
      const data = await fetchLeaderboard(getState().profile?.playerId ?? null);
      cache = { data, at: Date.now() };
      setState({ topScore: data.top[0]?.score ?? null, ...(data.me ? { rank: data.me.rank } : {}) });
      return data;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function refreshTopScore(): Promise<void> {
  try {
    await loadLeaderboard();
  } catch (e) {
    logError('leaderboard.top', e);
  }
}

export function invalidateLeaderboard(): void {
  cache = null;
}
