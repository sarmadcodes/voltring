import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_STATS, MAX_TOP_RUNS, sanitizeSettings, sanitizeStats, storage, type RunRecord } from '@/services/storage';
import { applyRun, getState, hydrate, recordRun, resetStats } from '@/state/store';

let clock = 1_000;
const run = (score: number, maxCombo = 5): RunRecord => ({ score, maxCombo, hits: 10, at: clock++ });

describe('applyRun (local records)', () => {
  it('records a new best and places it in the top list', () => {
    const { stats, newBest, rank } = applyRun(DEFAULT_STATS, run(500, 12));
    expect(newBest).toBe(true);
    expect(rank).toBe(1);
    expect(stats.best).toBe(500);
    expect(stats.bestCombo).toBe(12);
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.topRuns.map((r) => r.score)).toEqual([500]);
  });

  it('keeps the top list sorted and ranks a lower run correctly', () => {
    let s = applyRun(DEFAULT_STATS, run(500)).stats;
    s = applyRun(s, run(900)).stats;
    const res = applyRun(s, run(700));
    expect(res.newBest).toBe(false);
    expect(res.rank).toBe(2);
    expect(res.stats.topRuns.map((r) => r.score)).toEqual([900, 700, 500]);
  });

  it('keeps only the best 10 runs', () => {
    let s = DEFAULT_STATS;
    for (let i = 1; i <= 15; i++) s = applyRun(s, run(i * 100)).stats;
    expect(s.topRuns).toHaveLength(MAX_TOP_RUNS);
    expect(s.topRuns[0].score).toBe(1500);
    expect(s.topRuns[MAX_TOP_RUNS - 1].score).toBe(600);
    const low = applyRun(s, run(50));
    expect(low.rank).toBeNull();
    expect(low.stats.gamesPlayed).toBe(16);
  });

  it('never adds zero-score runs to the list', () => {
    const { stats, rank } = applyRun(DEFAULT_STATS, run(0));
    expect(stats.topRuns).toHaveLength(0);
    expect(rank).toBeNull();
    expect(stats.gamesPlayed).toBe(1);
  });

  it('a rewarded continue replaces its own entry and does not count as a new game', () => {
    const first = run(500);
    const s1 = applyRun(DEFAULT_STATS, first).stats;
    const cont = applyRun(s1, run(800), true, first);
    expect(cont.stats.gamesPlayed).toBe(1);
    expect(cont.stats.topRuns.map((r) => r.score)).toEqual([800]);
    expect(cont.stats.best).toBe(800);
  });
});

describe('recordRun + persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetStats();
  });

  it('dedupes a continued run by runId and survives a reload', async () => {
    recordRun({ runId: 'a', score: 300, hits: 12, maxCombo: 6, at: 1 }, false);
    recordRun({ runId: 'a', score: 450, hits: 18, maxCombo: 6, at: 2 }, true);
    recordRun({ runId: 'b', score: 200, hits: 9, maxCombo: 4, at: 3 }, false);
    expect(getState().stats.topRuns.map((r) => r.score)).toEqual([450, 200]);
    expect(getState().stats.gamesPlayed).toBe(2);
    await new Promise((r) => setTimeout(r, 0));
    expect(await storage.loadStats()).toEqual(getState().stats);
  });

  it('reset clears everything', () => {
    recordRun({ runId: 'c', score: 999, hits: 30, maxCombo: 9, at: 4 }, false);
    resetStats();
    expect(getState().stats).toEqual(DEFAULT_STATS);
  });

  it('hydrate loads saved data', async () => {
    await storage.saveStats({ best: 1234, bestCombo: 7, gamesPlayed: 3, topRuns: [run(1234, 7)] });
    await hydrate();
    expect(getState().ready).toBe(true);
    expect(getState().stats.best).toBe(1234);
  });
});

describe('storage sanitising', () => {
  it('falls back to defaults on corrupt data', () => {
    expect(sanitizeSettings('garbage')).toEqual({ sound: true, music: true, haptics: true });
    expect(sanitizeStats({ best: -5, bestCombo: 'x', gamesPlayed: NaN })).toEqual(DEFAULT_STATS);
  });

  it('repairs a tampered or unsorted top list', () => {
    const s = sanitizeStats({
      best: 10,
      topRuns: [{ score: 300, at: 2 }, { score: 'x' }, { score: 900, at: 1 }, null, { score: -4 }],
    });
    expect(s.topRuns.map((r) => r.score)).toEqual([900, 300]);
    expect(s.best).toBe(900);
  });

  it('round-trips through AsyncStorage', async () => {
    await storage.saveSettings({ sound: false, music: true, haptics: false });
    expect(await storage.loadSettings()).toEqual({ sound: false, music: true, haptics: false });
  });

  it('survives invalid JSON in storage', async () => {
    await AsyncStorage.setItem('voltring:v1:stats', '{not json');
    expect(await storage.loadStats()).toEqual(DEFAULT_STATS);
  });
});
