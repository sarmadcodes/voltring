/**
 * Pure scoring + difficulty rules. Every function here is a worklet so the
 * same code runs on the UI thread (game loop) and in Jest.
 *
 * IMPORTANT: `maxScoreForHits` is mirrored in supabase/migrations (voltring_max_score_for_hits).
 * Change both together or legitimate scores will be rejected server-side.
 */

export const START_LIVES = 3;
/** Extra degrees of forgiveness on each side of a gate, absorbs touch latency. */
export const HIT_TOLERANCE_DEG = 4;
/** Fraction of the gate half-width that counts as a PERFECT hit. */
export const PERFECT_FRACTION = 0.34;
export const MAX_MULTIPLIER = 8;
export const MAX_LEVEL_BONUS = 20;
export const COMBO_MILESTONE = 10;
/** Minimum time between two consecutive gates, keeps every pattern humanly reachable. */
export const MIN_REACTION_SEC = 0.35;
/**
 * Furthest a new gate may spawn ahead of the spark. Must stay well under 180deg: miss
 * detection uses the shortest angular delta, so anything further would read as "already passed".
 */
export const MAX_GATE_DISTANCE_DEG = 165;

export function levelForHits(hits: number): number {
  'worklet';
  return Math.floor(hits / 10);
}

/** Angular speed in degrees per second. Ramps quickly early, slowly late. */
export function speedForHits(hits: number): number {
  'worklet';
  if (hits <= 50) return 120 + hits * 4.2;
  return Math.min(330 + (hits - 50) * 0.9, 430);
}

/** Half-width of a normal gate in degrees. */
export function gateHalfForHits(hits: number): number {
  'worklet';
  return Math.max(26 - hits * 0.28, 10);
}

export function multiplierForCombo(combo: number): number {
  'worklet';
  return Math.min(1 + Math.floor(combo / 4), MAX_MULTIPLIER);
}

/**
 * Points for one hit.
 * @param hitIndex zero-based index of this hit within the run (all hits, not just the streak)
 * @param combo streak length including this hit
 */
export function pointsForHit(hitIndex: number, combo: number, perfect: boolean, golden: boolean): number {
  'worklet';
  const base = 10 + Math.min(levelForHits(hitIndex), MAX_LEVEL_BONUS);
  return base * (perfect ? 2 : 1) * (golden ? 3 : 1) * multiplierForCombo(combo);
}

/** Upper bound for any legitimate run with `hits` hits (every hit perfect + golden, unbroken combo). */
export function maxScoreForHits(hits: number): number {
  let total = 0;
  for (let i = 0; i < hits; i++) total += pointsForHit(i, i + 1, true, true);
  return total;
}

/** A run cannot land hits faster than one per MIN_REACTION_SEC (with a small allowance). */
export function maxHitsForDuration(durationMs: number): number {
  return Math.floor(durationMs / 250) + 3;
}
