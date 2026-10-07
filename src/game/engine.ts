import {
  HIT_TOLERANCE_DEG,
  MAX_GATE_DISTANCE_DEG,
  MIN_REACTION_SEC,
  PERFECT_FRACTION,
  START_LIVES,
  gateHalfForHits,
  pointsForHit,
  speedForHits,
} from './rules';

/**
 * The whole simulation lives in one plain mutable object so it can sit in a single
 * Reanimated shared value and be stepped on the UI thread without allocating per frame.
 * Angles are degrees, 0 = top of the ring, clockwise positive.
 */
export interface EngineState {
  status: number;
  angle: number;
  dir: number;
  speed: number;
  gate: number;
  half: number;
  drift: number;
  golden: boolean;
  hits: number;
  combo: number;
  maxCombo: number;
  lives: number;
  score: number;
  elapsedMs: number;
  seed: number;
  /** Bumped every time a new gate spawns so the renderer knows when to redraw the arc. */
  gateVersion: number;
  lastPoints: number;
}

export const Status = { Idle: 0, Playing: 1, Paused: 2, Over: 3 } as const;

export const Evt = {
  None: 0,
  Hit: 1,
  Perfect: 2,
  MissEarly: 3,
  MissLate: 4,
  GameOver: 5,
} as const;
export type EvtCode = (typeof Evt)[keyof typeof Evt];

const MAX_FRAME_MS = 50;

// Worklet functions are compiled to non-hoisted constants: always define before use.

export function wrapDeg(a: number): number {
  'worklet';
  const r = a % 360;
  return r < 0 ? r + 360 : r;
}

/** Signed shortest delta from gate to angle, in (-180, 180]. */
export function deltaDeg(angle: number, gate: number): number {
  'worklet';
  let d = wrapDeg(angle - gate);
  if (d > 180) d -= 360;
  return d;
}

/** mulberry32, deterministic so runs are reproducible in tests. */
export function nextRandom(s: EngineState): number {
  'worklet';
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Places the next gate ahead of the spark, never closer than MIN_REACTION_SEC of travel. */
export function spawnGate(s: EngineState): void {
  'worklet';
  const minDist = Math.min(Math.max(70, s.speed * MIN_REACTION_SEC), MAX_GATE_DISTANCE_DEG);
  const dist = minDist + nextRandom(s) * (MAX_GATE_DISTANCE_DEG - minDist);
  s.gate = wrapDeg(s.angle + s.dir * dist);
  s.half = gateHalfForHits(s.hits);
  s.golden = s.hits >= 15 && nextRandom(s) < 0.12;
  if (s.golden) s.half *= 0.6;
  s.drift = 0;
  if (!s.golden && s.hits >= 30 && nextRandom(s) < 0.25) {
    s.drift = (nextRandom(s) < 0.5 ? -1 : 1) * (15 + nextRandom(s) * 20);
  }
  s.gateVersion += 1;
}

export function createEngineState(seed: number): EngineState {
  'worklet';
  const s: EngineState = {
    status: Status.Idle,
    angle: 0,
    dir: 1,
    speed: speedForHits(0),
    gate: 0,
    half: gateHalfForHits(0),
    drift: 0,
    golden: false,
    hits: 0,
    combo: 0,
    maxCombo: 0,
    lives: START_LIVES,
    score: 0,
    elapsedMs: 0,
    seed: seed | 0,
    gateVersion: 0,
    lastPoints: 0,
  };
  spawnGate(s);
  return s;
}

function loseLife(s: EngineState, kind: EvtCode): EvtCode {
  'worklet';
  s.lives -= 1;
  s.combo = 0;
  if (s.lives <= 0) {
    s.lives = 0;
    s.status = Status.Over;
    return Evt.GameOver;
  }
  spawnGate(s);
  return kind;
}

export function step(s: EngineState, dtMs: number): EvtCode {
  'worklet';
  if (s.status !== Status.Playing) return Evt.None;
  // Clamp so a hitch (GC, notification shade) can't teleport the spark past a gate.
  const ms = Math.min(Math.max(dtMs, 0), MAX_FRAME_MS);
  const dt = ms / 1000;
  s.elapsedMs += ms;
  s.angle = wrapDeg(s.angle + s.dir * s.speed * dt);
  if (s.drift !== 0) s.gate = wrapDeg(s.gate + s.drift * dt);
  const progress = deltaDeg(s.angle, s.gate) * s.dir;
  if (progress > s.half + HIT_TOLERANCE_DEG) return loseLife(s, Evt.MissLate);
  return Evt.None;
}

export function tap(s: EngineState): EvtCode {
  'worklet';
  if (s.status !== Status.Playing) return Evt.None;
  const d = Math.abs(deltaDeg(s.angle, s.gate));
  if (d > s.half + HIT_TOLERANCE_DEG) return loseLife(s, Evt.MissEarly);

  const perfect = d <= Math.max(s.half * PERFECT_FRACTION, 3);
  const hitIndex = s.hits;
  s.hits += 1;
  s.combo += 1;
  if (s.combo > s.maxCombo) s.maxCombo = s.combo;
  s.lastPoints = pointsForHit(hitIndex, s.combo, perfect, s.golden);
  s.score += s.lastPoints;
  s.speed = speedForHits(s.hits);
  // Early game always reverses (easy to read); later it sometimes keeps going to break rhythm.
  if (s.hits < 8 || nextRandom(s) < 0.8) s.dir = -s.dir;
  spawnGate(s);
  return perfect ? Evt.Perfect : Evt.Hit;
}

/** Rewarded-ad continue: one life back, streak lost, score kept. */
export function revive(s: EngineState): void {
  'worklet';
  if (s.status !== Status.Over) return;
  s.lives = 1;
  s.combo = 0;
  s.status = Status.Paused;
  spawnGate(s);
}
