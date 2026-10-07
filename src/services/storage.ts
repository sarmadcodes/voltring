import AsyncStorage from '@react-native-async-storage/async-storage';

import { logError } from '@/lib/log';

const PREFIX = 'voltring:v1:';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
}

export interface Profile {
  username: string;
  /** Random per-install credential used to authorise writes to this player's row. Never shown publicly. */
  secret: string;
  /** Server row id once registered; null while offline or before first sync. */
  playerId: string | null;
  /** Server reported the local name is taken; the player must pick another before syncing. */
  nameConflict: boolean;
  lastRenameAt: number | null;
}

export interface PendingScore {
  runId: string;
  score: number;
  hits: number;
  durationMs: number;
  maxCombo: number;
}

export interface Stats {
  best: number;
  bestCombo: number;
  gamesPlayed: number;
  /** Highest score the server has confirmed for this player. */
  syncedBest: number;
  pending: PendingScore | null;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, haptics: true };
export const DEFAULT_STATS: Stats = { best: 0, bestCombo: 0, gamesPlayed: 0, syncedBest: 0, pending: null };

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

export function sanitizePending(v: unknown): PendingScore | null {
  if (!isObj(v) || typeof v.runId !== 'string') return null;
  return {
    runId: v.runId,
    score: num(v.score),
    hits: num(v.hits),
    durationMs: num(v.durationMs),
    maxCombo: num(v.maxCombo),
  };
}

export function sanitizeStats(v: unknown): Stats {
  if (!isObj(v)) return { ...DEFAULT_STATS };
  return {
    best: num(v.best),
    bestCombo: num(v.bestCombo),
    gamesPlayed: num(v.gamesPlayed),
    syncedBest: num(v.syncedBest),
    pending: sanitizePending(v.pending),
  };
}

export function sanitizeProfile(v: unknown): Profile | null {
  if (!isObj(v) || typeof v.username !== 'string' || typeof v.secret !== 'string') return null;
  if (v.username.length === 0 || v.secret.length < 32) return null;
  return {
    username: v.username,
    secret: v.secret,
    playerId: typeof v.playerId === 'string' ? v.playerId : null,
    nameConflict: bool(v.nameConflict, false),
    lastRenameAt: typeof v.lastRenameAt === 'number' ? v.lastRenameAt : null,
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
  loadProfile: async () => sanitizeProfile(await read('profile')),
  saveProfile: (p: Profile) => write('profile', p),
  clearProfile: async () => {
    try {
      await AsyncStorage.removeItem(PREFIX + 'profile');
    } catch (e) {
      logError('storage.clear', e);
    }
  },
};
