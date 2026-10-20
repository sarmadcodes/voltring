import { useSyncExternalStore } from 'react';

import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  MAX_TOP_RUNS,
  storage,
  type RunRecord,
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
}

let state: AppData = {
  ready: false,
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
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
      const [settings, stats] = await Promise.all([storage.loadSettings(), storage.loadStats()]);
      setState({ settings, stats, ready: true });
    })();
  }
  return hydrating;
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...state.settings, ...patch };
  setState({ settings });
  void storage.saveSettings(settings);
}

export function setStats(stats: Stats): void {
  setState({ stats });
  void storage.saveStats(stats);
}

export interface FinishedRun {
  /** Identifies the run so a rewarded continue updates its record instead of adding a second one. */
  runId: string;
  score: number;
  hits: number;
  maxCombo: number;
  at: number;
}

/** Runs already written to the top list, keyed by runId, so a continue can replace its own entry. */
const recordedRuns = new Map<string, RunRecord>();

/**
 * Applies a finished run to local stats. Pure so it can be unit-tested.
 * A rewarded continue ends the same run a second time: it must not count as another
 * game, and it replaces (not duplicates) that run's top-list entry.
 */
export function applyRun(
  stats: Stats,
  run: RunRecord,
  isContinuation = false,
  previous: RunRecord | null = null,
): { stats: Stats; newBest: boolean; rank: number | null } {
  const newBest = run.score > stats.best;
  let topRuns = previous ? stats.topRuns.filter((r) => r !== previous) : stats.topRuns;
  if (run.score > 0) {
    topRuns = [...topRuns, run].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, MAX_TOP_RUNS);
  }
  const idx = topRuns.indexOf(run);
  return {
    newBest,
    rank: idx >= 0 ? idx + 1 : null,
    stats: {
      best: Math.max(stats.best, run.score),
      bestCombo: Math.max(stats.bestCombo, run.maxCombo),
      gamesPlayed: stats.gamesPlayed + (isContinuation ? 0 : 1),
      topRuns,
    },
  };
}

/** Saves a finished run on the device. Returns its place in the personal top 10, if any. */
export function recordRun(run: FinishedRun, isContinuation: boolean): { newBest: boolean; rank: number | null } {
  const record: RunRecord = { score: run.score, hits: run.hits, maxCombo: run.maxCombo, at: run.at };
  const previous = recordedRuns.get(run.runId) ?? null;
  const result = applyRun(state.stats, record, isContinuation, previous);
  recordedRuns.set(run.runId, record);
  setStats(result.stats);
  return { newBest: result.newBest, rank: result.rank };
}

export function resetStats(): void {
  recordedRuns.clear();
  setStats({ ...DEFAULT_STATS, topRuns: [] });
}
