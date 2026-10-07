import { useSyncExternalStore } from 'react';

import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  storage,
  type PendingScore,
  type Profile,
  type Settings,
  type Stats,
} from '@/services/storage';

/**
 * Tiny external store for persistent, low-frequency app data. Game-loop state never
 * lives here (it stays on the UI thread in a shared value).
 */
export interface AppData {
  ready: boolean;
  settings: Settings;
  stats: Stats;
  profile: Profile | null;
  /** Last global rank the server reported for this player, if any. */
  rank: number | null;
  sync: 'idle' | 'syncing' | 'failed';
  /** #1 score on the global board, shown on Home once known. */
  topScore: number | null;
}

let state: AppData = {
  ready: false,
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
  profile: null,
  rank: null,
  sync: 'idle',
  topScore: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getState(): AppData {
  return state;
}

export function setState(patch: Partial<AppData>): void {
  state = { ...state, ...patch };
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppData<T>(selector: (s: AppData) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

let hydrating: Promise<void> | null = null;

export function hydrate(): Promise<void> {
  if (!hydrating) {
    hydrating = (async () => {
      const [settings, stats, profile] = await Promise.all([
        storage.loadSettings(),
        storage.loadStats(),
        storage.loadProfile(),
      ]);
      setState({ settings, stats, profile, ready: true });
    })();
  }
  return hydrating;
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...state.settings, ...patch };
  setState({ settings });
  void storage.saveSettings(settings);
}

export function setProfile(profile: Profile | null): void {
  setState({ profile });
  if (profile) void storage.saveProfile(profile);
  else void storage.clearProfile();
}

export function setStats(stats: Stats): void {
  setState({ stats });
  void storage.saveStats(stats);
}

/**
 * Applies a finished run to local stats. Pure so it can be unit-tested.
 * Only a run that beats everything already synced or queued becomes the pending submission,
 * so the backend sees at most one write per personal best. A rewarded continue ends the
 * same run a second time, so it must not count as another game.
 */
export function applyRun(
  stats: Stats,
  run: PendingScore,
  isContinuation = false,
): { stats: Stats; newBest: boolean } {
  const newBest = run.score > stats.best;
  const queuedBest = Math.max(stats.syncedBest, stats.pending?.score ?? 0);
  const pending = run.score > queuedBest ? run : stats.pending;
  return {
    newBest,
    stats: {
      best: Math.max(stats.best, run.score),
      bestCombo: Math.max(stats.bestCombo, run.maxCombo),
      gamesPlayed: stats.gamesPlayed + (isContinuation ? 0 : 1),
      syncedBest: stats.syncedBest,
      pending,
    },
  };
}
