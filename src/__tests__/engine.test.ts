import {
  Evt,
  Status,
  createEngineState,
  deltaDeg,
  revive,
  spawnGate,
  step,
  tap,
  wrapDeg,
  type EngineState,
} from '@/game/engine';
import { HIT_TOLERANCE_DEG, MAX_GATE_DISTANCE_DEG, MIN_REACTION_SEC, START_LIVES, maxScoreForHits } from '@/game/rules';

function playing(seed = 42): EngineState {
  const s = createEngineState(seed);
  s.status = Status.Playing;
  return s;
}

/** Puts the spark at the gate centre plus an offset in degrees. */
function align(s: EngineState, offset = 0) {
  s.angle = wrapDeg(s.gate + offset);
}

describe('angle helpers', () => {
  it('wraps and measures the shortest signed delta', () => {
    expect(wrapDeg(-10)).toBe(350);
    expect(wrapDeg(725)).toBe(5);
    expect(deltaDeg(10, 350)).toBe(20);
    expect(deltaDeg(350, 10)).toBe(-20);
  });
});

describe('engine', () => {
  it('is deterministic for a given seed', () => {
    const a = playing(7);
    const b = playing(7);
    for (let i = 0; i < 200; i++) {
      step(a, 16);
      step(b, 16);
    }
    expect(a).toEqual(b);
  });

  it('ignores input and time unless playing', () => {
    const s = createEngineState(1);
    const before = { ...s };
    expect(tap(s)).toBe(Evt.None);
    expect(step(s, 16)).toBe(Evt.None);
    expect(s).toEqual(before);
  });

  it('scores a centred tap as PERFECT and builds combo', () => {
    const s = playing();
    align(s);
    expect(tap(s)).toBe(Evt.Perfect);
    expect(s.hits).toBe(1);
    expect(s.combo).toBe(1);
    expect(s.score).toBe(20);
  });

  it('accepts an edge tap within tolerance as a normal hit', () => {
    const s = playing();
    align(s, s.half + HIT_TOLERANCE_DEG - 0.5);
    expect(tap(s)).toBe(Evt.Hit);
  });

  it('reverses direction after early hits', () => {
    const s = playing();
    const dir = s.dir;
    align(s);
    tap(s);
    expect(s.dir).toBe(-dir);
  });

  it('an early tap costs a life and resets the combo', () => {
    const s = playing();
    align(s);
    tap(s);
    align(s, -s.dir * 60);
    expect(tap(s)).toBe(Evt.MissEarly);
    expect(s.lives).toBe(START_LIVES - 1);
    expect(s.combo).toBe(0);
  });

  it('letting the spark pass the gate is a late miss', () => {
    const s = playing();
    let evt: number = Evt.None;
    for (let i = 0; i < 400 && evt === Evt.None; i++) evt = step(s, 16);
    expect(evt).toBe(Evt.MissLate);
    expect(s.lives).toBe(START_LIVES - 1);
  });

  it('ends the run exactly once when lives run out', () => {
    const s = playing();
    const events: number[] = [];
    for (let i = 0; i < 3; i++) {
      align(s, 120);
      events.push(tap(s));
    }
    expect(events).toEqual([Evt.MissEarly, Evt.MissEarly, Evt.GameOver]);
    expect(s.status).toBe(Status.Over);
    expect(tap(s)).toBe(Evt.None);
    expect(step(s, 16)).toBe(Evt.None);
  });

  it('clamps long frames so a hitch cannot skip a gate', () => {
    const s = playing();
    const a0 = s.angle;
    step(s, 5000);
    expect(Math.abs(deltaDeg(s.angle, a0))).toBeLessThanOrEqual(s.speed * 0.05 + 1e-9);
    expect(s.elapsedMs).toBe(50);
  });

  it('revive restores one life and keeps the score', () => {
    const s = playing();
    align(s);
    tap(s);
    const score = s.score;
    s.lives = 1;
    align(s, 150);
    expect(tap(s)).toBe(Evt.GameOver);
    revive(s);
    expect(s.lives).toBe(1);
    expect(s.score).toBe(score);
    expect(s.status).toBe(Status.Paused);
  });

  it('always spawns gates at least MIN_REACTION_SEC of travel ahead (fairness)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = playing(seed);
      for (let h = 0; h < 120; h++) {
        s.hits = h;
        s.speed = 120 + h * 2.5;
        spawnGate(s);
        const forward = wrapDeg((s.gate - s.angle) * s.dir);
        expect(forward / s.speed).toBeGreaterThanOrEqual(MIN_REACTION_SEC - 1e-9);
        expect(forward).toBeLessThanOrEqual(MAX_GATE_DISTANCE_DEG + 1e-9);
      }
    }
  });

  it('a perfect-timing bot survives long runs on every seed, and scores stay under the server bound', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = playing(seed);
      let frames = 0;
      while (s.hits < 300 && s.status === Status.Playing && frames < 200_000) {
        step(s, 16);
        frames++;
        if (Math.abs(deltaDeg(s.angle, s.gate)) <= s.half) tap(s);
      }
      expect(s.hits).toBe(300);
      expect(s.lives).toBe(START_LIVES);
      expect(s.score).toBeLessThanOrEqual(maxScoreForHits(s.hits));
    }
  });
});
