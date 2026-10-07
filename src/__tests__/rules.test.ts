import {
  MAX_MULTIPLIER,
  gateHalfForHits,
  maxHitsForDuration,
  maxScoreForHits,
  multiplierForCombo,
  pointsForHit,
  speedForHits,
} from '@/game/rules';

describe('difficulty curve', () => {
  it('starts slow and wide so the first seconds are accessible', () => {
    expect(speedForHits(0)).toBe(120);
    expect(gateHalfForHits(0)).toBe(26);
  });

  it('speeds up monotonically and caps', () => {
    let prev = 0;
    for (let h = 0; h <= 1000; h++) {
      const s = speedForHits(h);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
    expect(speedForHits(10_000)).toBe(430);
  });

  it('narrows gates gradually down to a floor', () => {
    expect(gateHalfForHits(10)).toBeLessThan(gateHalfForHits(0));
    expect(gateHalfForHits(500)).toBe(10);
  });
});

describe('combo and scoring', () => {
  it('raises the multiplier every 4 hits and caps it', () => {
    expect(multiplierForCombo(0)).toBe(1);
    expect(multiplierForCombo(3)).toBe(1);
    expect(multiplierForCombo(4)).toBe(2);
    expect(multiplierForCombo(8)).toBe(3);
    expect(multiplierForCombo(1000)).toBe(MAX_MULTIPLIER);
  });

  it('rewards perfect, golden, level and combo', () => {
    expect(pointsForHit(0, 1, false, false)).toBe(10);
    expect(pointsForHit(0, 1, true, false)).toBe(20);
    expect(pointsForHit(0, 1, false, true)).toBe(30);
    expect(pointsForHit(0, 4, false, false)).toBe(20);
    expect(pointsForHit(10, 1, false, false)).toBe(11);
  });

  it('maxScoreForHits matches the server formula', () => {
    // Re-implementation of the SQL: sum((10 + least(i/10,20)) * 6 * least(1 + (i+1)/4, 8)).
    const sql = (n: number) => {
      let t = 0;
      for (let i = 0; i < n; i++) {
        t += (10 + Math.min(Math.floor(i / 10), 20)) * 6 * Math.min(1 + Math.floor((i + 1) / 4), 8);
      }
      return t;
    };
    for (const n of [0, 1, 3, 4, 10, 37, 250, 1000]) expect(maxScoreForHits(n)).toBe(sql(n));
    expect(maxScoreForHits(1)).toBe(60);
  });

  it('bounds hits by elapsed time', () => {
    expect(maxHitsForDuration(0)).toBe(3);
    expect(maxHitsForDuration(10_000)).toBe(43);
  });
});
