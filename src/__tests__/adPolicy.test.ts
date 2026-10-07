import { AD_POLICY, shouldShowInterstitial, type AdHistory } from '@/services/adPolicy';

const base: AdHistory = { lifetimeGames: 20, gamesSinceInterstitial: 10, lastInterstitialAt: 0, lastRewardedAt: 0 };
const now = 10 * 60_000;

describe('interstitial frequency', () => {
  it('shows when every rule is satisfied', () => {
    expect(shouldShowInterstitial(base, now)).toBe(true);
  });

  it('never shows to brand-new players', () => {
    expect(shouldShowInterstitial({ ...base, lifetimeGames: AD_POLICY.graceGames - 1 }, now)).toBe(false);
  });

  it('respects the game count between ads', () => {
    expect(shouldShowInterstitial({ ...base, gamesSinceInterstitial: AD_POLICY.everyNGames - 1 }, now)).toBe(false);
  });

  it('respects the time cooldown', () => {
    expect(shouldShowInterstitial({ ...base, lastInterstitialAt: now - 1000 }, now)).toBe(false);
  });

  it('never stacks right after a rewarded ad', () => {
    expect(shouldShowInterstitial({ ...base, lastRewardedAt: now - 1000 }, now)).toBe(false);
  });
});
