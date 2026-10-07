import { getRandomBytes, randomUUID } from 'expo-crypto';

import { LEADERBOARD_ENABLED } from '@/config/env';
import { logError } from '@/lib/log';
import { applyRun, getState, setProfile, setState, setStats } from '@/state/store';

import { isApiError } from './api';
import { invalidateLeaderboard } from './leaderboardCache';
import { registerPlayer, renamePlayer, submitScore } from './player';
import type { PendingScore, Profile } from './storage';

export function newRunId(): string {
  return randomUUID();
}

export function newSecret(): string {
  const bytes = getRandomBytes(32);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createLocalProfile(username: string): Profile {
  return { username, secret: newSecret(), playerId: null, nameConflict: false, lastRenameAt: null };
}

/** Exponential backoff so bad connectivity never turns into a hammering retry loop. */
const BACKOFF_MS = [0, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000];
let failures = 0;
let nextAttemptAt = 0;
let inFlight: Promise<void> | null = null;

function noteFailure() {
  failures = Math.min(failures + 1, BACKOFF_MS.length - 1);
  nextAttemptAt = Date.now() + BACKOFF_MS[failures];
}

function noteSuccess() {
  failures = 0;
  nextAttemptAt = 0;
}

export function resetBackoffForTests() {
  failures = 0;
  nextAttemptAt = 0;
  inFlight = null;
}

async function ensureRegistered(): Promise<Profile | null> {
  const profile = getState().profile;
  if (!profile || profile.nameConflict) return null;
  if (profile.playerId) return profile;
  try {
    const playerId = await registerPlayer(profile.username, profile.secret);
    const next = { ...profile, playerId };
    // Profile may have changed while the request was in the air (rename); only patch the id.
    const current = getState().profile;
    if (current && current.secret === profile.secret) setProfile({ ...current, playerId });
    return next;
  } catch (e) {
    if (isApiError(e, 'username_taken') || isApiError(e, 'invalid_username')) {
      const current = getState().profile;
      if (current && current.secret === profile.secret) setProfile({ ...current, nameConflict: true });
      return null;
    }
    throw e;
  }
}

/**
 * Pushes the queued personal best (if any). Safe to call often: concurrent calls share one
 * request, and failures back off. Never throws.
 */
export function syncNow(force = false): Promise<void> {
  if (!LEADERBOARD_ENABLED) return Promise.resolve();
  if (inFlight) return inFlight;
  if (!force && Date.now() < nextAttemptAt) return Promise.resolve();
  inFlight = (async () => {
    setState({ sync: 'syncing' });
    try {
      const profile = await ensureRegistered();
      if (!profile?.playerId) {
        setState({ sync: 'idle' });
        return;
      }
      const pending = getState().stats.pending;
      if (!pending) {
        setState({ sync: 'idle' });
        noteSuccess();
        return;
      }
      try {
        const res = await submitScore(profile.playerId, profile.secret, pending);
        const stats = getState().stats;
        setStats({
          ...stats,
          syncedBest: Math.max(stats.syncedBest, res.best),
          // A newer, better run may have been queued while this one was in flight.
          pending: stats.pending && stats.pending.runId !== pending.runId ? stats.pending : null,
        });
        setState({ rank: res.rank, sync: 'idle' });
        invalidateLeaderboard();
        noteSuccess();
      } catch (e) {
        if (isApiError(e, 'rejected')) {
          // The server will never accept this run; drop it instead of retrying forever.
          const stats = getState().stats;
          if (stats.pending?.runId === pending.runId) setStats({ ...stats, pending: null });
          setState({ sync: 'idle' });
          return;
        }
        if (isApiError(e, 'unauthorized')) {
          // Row was deleted server-side; re-register on next sync under the same name.
          const current = getState().profile;
          if (current) setProfile({ ...current, playerId: null });
        }
        throw e;
      }
    } catch (e) {
      logError('sync', e);
      setState({ sync: 'failed' });
      noteFailure();
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Records a finished run locally (always works offline) and kicks off a background sync. */
export function recordRun(run: PendingScore, isContinuation: boolean): { newBest: boolean } {
  const { stats, newBest } = applyRun(getState().stats, run, isContinuation);
  setStats(stats);
  if (stats.pending?.runId === run.runId) void syncNow(true);
  return { newBest };
}

export type NameResult = { ok: true } | { ok: false; reason: 'taken' | 'cooldown' | 'offline' | 'reserved' };

/**
 * Changes the player name. Unregistered players just change it locally (it is checked at
 * first sync). Registered players must be online so uniqueness is enforced server-side.
 */
export async function changeUsername(username: string): Promise<NameResult> {
  const profile = getState().profile;
  if (!profile) return { ok: false, reason: 'offline' };
  if (!profile.playerId || !LEADERBOARD_ENABLED) {
    setProfile({ ...profile, username, nameConflict: false });
    void syncNow(true);
    return { ok: true };
  }
  try {
    await renamePlayer(profile.playerId, profile.secret, username);
    const changedKey = profile.username.toLowerCase() !== username.toLowerCase();
    setProfile({ ...profile, username, nameConflict: false, lastRenameAt: changedKey ? Date.now() : profile.lastRenameAt });
    return { ok: true };
  } catch (e) {
    if (isApiError(e, 'username_taken')) return { ok: false, reason: 'taken' };
    if (isApiError(e, 'rename_cooldown')) return { ok: false, reason: 'cooldown' };
    if (isApiError(e, 'invalid_username')) return { ok: false, reason: 'reserved' };
    logError('rename', e);
    return { ok: false, reason: 'offline' };
  }
}
