import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_STATS, sanitizeProfile, sanitizeSettings, sanitizeStats, storage } from '@/services/storage';
import { applyRun } from '@/state/store';

const run = (score: number, runId = `r${score}`) => ({ runId, score, hits: 10, durationMs: 20_000, maxCombo: 7 });

describe('applyRun (local high score + submission queue)', () => {
  it('records a new best and queues it for sync', () => {
    const { stats, newBest } = applyRun(DEFAULT_STATS, run(500));
    expect(newBest).toBe(true);
    expect(stats.best).toBe(500);
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.pending?.score).toBe(500);
  });

  it('does not queue runs that would not improve the server best', () => {
    const synced = { ...DEFAULT_STATS, best: 800, syncedBest: 800 };
    const { stats, newBest } = applyRun(synced, run(300));
    expect(newBest).toBe(false);
    expect(stats.pending).toBeNull();
    expect(stats.best).toBe(800);
  });

  it('keeps only the highest queued run while offline', () => {
    let s = applyRun(DEFAULT_STATS, run(500)).stats;
    s = applyRun(s, run(300)).stats;
    expect(s.pending?.score).toBe(500);
    s = applyRun(s, run(900)).stats;
    expect(s.pending?.score).toBe(900);
    expect(s.gamesPlayed).toBe(3);
  });

  it('does not count a rewarded continue as an extra game', () => {
    const first = applyRun(DEFAULT_STATS, run(500, 'same')).stats;
    const cont = applyRun(first, run(700, 'same'), true).stats;
    expect(cont.gamesPlayed).toBe(1);
    expect(cont.pending).toEqual(run(700, 'same'));
  });
});

describe('storage sanitising', () => {
  it('falls back to defaults on corrupt data', () => {
    expect(sanitizeSettings('garbage')).toEqual({ sound: true, music: true, haptics: true });
    expect(sanitizeStats({ best: -5, bestCombo: 'x', gamesPlayed: NaN })).toEqual(DEFAULT_STATS);
    expect(sanitizeProfile({ username: 'A', secret: 'short' })).toBeNull();
  });

  it('round-trips through AsyncStorage', async () => {
    await storage.saveSettings({ sound: false, music: true, haptics: false });
    expect(await storage.loadSettings()).toEqual({ sound: false, music: true, haptics: false });

    const stats = { ...DEFAULT_STATS, best: 1234, pending: run(1234) };
    await storage.saveStats(stats);
    expect(await storage.loadStats()).toEqual(stats);
  });

  it('survives invalid JSON in storage', async () => {
    await AsyncStorage.setItem('voltring:v1:stats', '{not json');
    expect(await storage.loadStats()).toEqual(DEFAULT_STATS);
  });
});
