/**
 * Interstitial frequency rules, kept pure and separate so they're easy to tune and test.
 * The player is the customer: ads only at natural breaks, never stacked, never early.
 */
export const AD_POLICY = {
  /** Completed games (lifetime) before the first interstitial is ever considered. */
  graceGames: 3,
  /** Show at most once every N completed games. */
  everyNGames: 4,
  /** Minimum wall-clock gap between two interstitials. */
  minIntervalMs: 3 * 60_000,
  /** Quiet period after a rewarded ad the player chose to watch. */
  afterRewardedMs: 2 * 60_000,
};

export interface AdHistory {
  lifetimeGames: number;
  gamesSinceInterstitial: number;
  lastInterstitialAt: number;
  lastRewardedAt: number;
}

export function shouldShowInterstitial(h: AdHistory, now: number, policy = AD_POLICY): boolean {
  if (h.lifetimeGames < policy.graceGames) return false;
  if (h.gamesSinceInterstitial < policy.everyNGames) return false;
  if (now - h.lastInterstitialAt < policy.minIntervalMs) return false;
  if (now - h.lastRewardedAt < policy.afterRewardedMs) return false;
  return true;
}
