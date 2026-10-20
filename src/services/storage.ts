import AsyncStorage from '@react-native-async-storage/async-storage';

import { logError } from '@/lib/log';

/**
 * Everything the game remembers lives on the device. There is no backend: uninstalling
 * the app is the only way data leaves, and nothing is ever sent anywhere.
 */
const PREFIX = 'voltring:v1:';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
}

export interface RunRecord {
  score: number;
  maxCombo: number;
  hits: number;
  /** Epoch ms when the run ended. */
  at: number;
}

export interface Stats {
  best: number;
  bestCombo: number;
  gamesPlayed: number;
  /** Personal top runs, highest first. */
  topRuns: RunRecord[];
}

export const MAX_TOP_RUNS = 10;
export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, haptics: true };
export const DEFAULT_STATS: Stats = { best: 0, bestCombo: 0, gamesPlayed: 0, topRuns: [] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

export function sanitizeSettings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS };
  return {
    sound: bool(v.sound, true),
    music: bool(v.music, true),
    haptics: bool(v.haptics, true),
  };
}

function sanitizeRun(v: unknown): RunRecord | null {
  if (!isObj(v)) return null;
  const score = num(v.score, -1);
  if (score <= 0) return null;
  return { score, maxCombo: num(v.maxCombo), hits: num(v.hits), at: num(v.at) };
}

export function sanitizeStats(v: unknown): Stats {
  if (!isObj(v)) return { ...DEFAULT_STATS, topRuns: [] };
  const topRuns = (Array.isArray(v.topRuns) ? v.topRuns : [])
    .map(sanitizeRun)
    .filter((r): r is RunRecord => r !== null)
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, MAX_TOP_RUNS);
  return {
    // Best can never be lower than the best recorded run, even if storage was edited.
    best: Math.max(num(v.best), topRuns[0]?.score ?? 0),
    bestCombo: num(v.bestCombo),
    gamesPlayed: num(v.gamesPlayed),
    topRuns,
  };
}

async function read(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw == null ? null : JSON.parse(raw);
  } catch (e) {
    // Corrupt JSON or storage failure: fall back to defaults instead of crashing.
    logError('storage.read', e);
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    logError('storage.write', e);
  }
}

export const storage = {
  loadSettings: async () => sanitizeSettings(await read('settings')),
  saveSettings: (s: Settings) => write('settings', s),
  loadStats: async () => sanitizeStats(await read('stats')),
  saveStats: (s: Stats) => write('stats', s),
};
