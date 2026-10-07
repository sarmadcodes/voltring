import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { ADMOB_UNITS, IS_PRODUCTION } from '@/config/env';
import { logError } from '@/lib/log';
import { getState } from '@/state/store';

import { AD_POLICY, shouldShowInterstitial, type AdHistory } from './adPolicy';

type AdsModule = typeof import('react-native-google-mobile-ads');
type Interstitial = import('react-native-google-mobile-ads').InterstitialAd;
type Rewarded = import('react-native-google-mobile-ads').RewardedAd;

/**
 * Ads are strictly optional. Expo Go has no AdMob native module, and any SDK failure
 * must degrade to "no ad" rather than blocking or crashing the game.
 */
let mod: AdsModule | null = null;
function loadModule(): AdsModule | null {
  if (mod) return mod;
  if (Platform.OS !== 'android') return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-google-mobile-ads') as AdsModule;
  } catch (e) {
    logError('ads.load', e);
    mod = null;
  }
  return mod;
}

/** Development and preview builds always use Google's official test units. Production never does. */
export function adUnit(kind: 'banner' | 'interstitial' | 'rewarded'): string | null {
  const m = loadModule();
  if (!m) return null;
  if (!IS_PRODUCTION) {
    return { banner: m.TestIds.ADAPTIVE_BANNER, interstitial: m.TestIds.INTERSTITIAL, rewarded: m.TestIds.REWARDED }[kind];
  }
  return ADMOB_UNITS[kind] || null;
}

let canRequestAds = false;
let privacyOptionsRequired = false;
let initPromise: Promise<void> | null = null;
const readyListeners = new Set<() => void>();

export function adsReady(): boolean {
  return canRequestAds;
}

export function onAdsReady(cb: () => void): () => void {
  readyListeners.add(cb);
  return () => readyListeners.delete(cb);
}

export function isPrivacyOptionsRequired(): boolean {
  return privacyOptionsRequired;
}

/**
 * Gathers consent through Google's UMP SDK (shows the form only where the law requires it),
 * then initialises the Mobile Ads SDK only if ads may be requested.
 */
export function initAds(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const m = loadModule();
    if (!m) return;
    try {
      let info;
      try {
        info = await m.AdsConsent.gatherConsent();
      } catch (e) {
        // Form failed (offline, misconfigured message): fall back to whatever consent is stored.
        logError('ads.consent', e);
        info = await m.AdsConsent.getConsentInfo();
      }
      privacyOptionsRequired =
        info.privacyOptionsRequirementStatus === m.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
      if (!info.canRequestAds) return;
      await m.default().setRequestConfiguration({
        maxAdContentRating: m.MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await m.default().initialize();
      canRequestAds = true;
      loadInterstitial();
      loadRewarded();
      for (const cb of readyListeners) cb();
    } catch (e) {
      logError('ads.init', e);
    }
  })();
  return initPromise;
}

/** Lets players review or withdraw consent at any time (required by UMP where applicable). */
export async function showPrivacyOptions(): Promise<void> {
  const m = loadModule();
  if (!m) return;
  try {
    const info = await m.AdsConsent.showPrivacyOptionsForm();
    canRequestAds = canRequestAds && info.canRequestAds;
  } catch (e) {
    logError('ads.privacy', e);
  }
}

// ---------------------------------------------------------------------------
// Interstitial
// ---------------------------------------------------------------------------

let interstitial: Interstitial | null = null;
let interstitialLoaded = false;
let interstitialRetry: ReturnType<typeof setTimeout> | null = null;

const history: AdHistory = { lifetimeGames: 0, gamesSinceInterstitial: 0, lastInterstitialAt: 0, lastRewardedAt: 0 };

function loadInterstitial() {
  const m = loadModule();
  const unit = adUnit('interstitial');
  if (!m || !unit || !canRequestAds) return;
  try {
    interstitialLoaded = false;
    interstitial = m.InterstitialAd.createForAdRequest(unit);
    interstitial.addAdEventListener(m.AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    interstitial.addAdEventListener(m.AdEventType.ERROR, () => {
      interstitialLoaded = false;
      // Retry later, slowly: no tight loops on bad networks.
      if (interstitialRetry) clearTimeout(interstitialRetry);
      interstitialRetry = setTimeout(loadInterstitial, 90_000);
    });
    interstitial.load();
  } catch (e) {
    logError('ads.interstitial.load', e);
  }
}

export function noteGameCompleted(): void {
  history.lifetimeGames = getState().stats.gamesPlayed;
  history.gamesSinceInterstitial += 1;
}

/**
 * Called at a natural break (leaving the game-over screen). Resolves when the player can
 * continue: immediately if no ad is due/ready, otherwise when the ad closes or fails.
 */
export function maybeShowInterstitial(): Promise<void> {
  const m = loadModule();
  history.lifetimeGames = getState().stats.gamesPlayed;
  if (!m || !interstitial || !interstitialLoaded || !shouldShowInterstitial(history, Date.now())) {
    return Promise.resolve();
  }
  const ad = interstitial;
  return new Promise((resolve) => {
    let done = false;
    const unsubs: (() => void)[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      unsubs.forEach((u) => u());
      clearTimeout(guard);
      loadInterstitial();
      resolve();
    };
    // If the SDK never reports back, don't strand the player.
    const guard = setTimeout(finish, 60_000);
    unsubs.push(ad.addAdEventListener(m.AdEventType.CLOSED, finish));
    unsubs.push(ad.addAdEventListener(m.AdEventType.ERROR, finish));
    history.gamesSinceInterstitial = 0;
    history.lastInterstitialAt = Date.now();
    interstitialLoaded = false;
    ad.show().catch(finish);
  });
}

// ---------------------------------------------------------------------------
// Rewarded (optional "continue")
// ---------------------------------------------------------------------------

let rewarded: Rewarded | null = null;
let rewardedLoaded = false;
let rewardedRetry: ReturnType<typeof setTimeout> | null = null;
const rewardedListeners = new Set<(ready: boolean) => void>();

function setRewardedLoaded(v: boolean) {
  rewardedLoaded = v;
  for (const l of rewardedListeners) l(v);
}

function loadRewarded() {
  const m = loadModule();
  const unit = adUnit('rewarded');
  if (!m || !unit || !canRequestAds) return;
  try {
    setRewardedLoaded(false);
    rewarded = m.RewardedAd.createForAdRequest(unit);
    rewarded.addAdEventListener(m.RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
    rewarded.addAdEventListener(m.AdEventType.ERROR, () => {
      setRewardedLoaded(false);
      if (rewardedRetry) clearTimeout(rewardedRetry);
      rewardedRetry = setTimeout(loadRewarded, 90_000);
    });
    rewarded.load();
  } catch (e) {
    logError('ads.rewarded.load', e);
  }
}

export function isRewardedReady(): boolean {
  return rewardedLoaded;
}

export function onRewardedReadyChange(cb: (ready: boolean) => void): () => void {
  rewardedListeners.add(cb);
  return () => rewardedListeners.delete(cb);
}

/** Resolves true only if the player actually earned the reward. */
export function showRewarded(): Promise<boolean> {
  const m = loadModule();
  if (!m || !rewarded || !rewardedLoaded) return Promise.resolve(false);
  const ad = rewarded;
  return new Promise((resolve) => {
    let earned = false;
    let done = false;
    const unsubs: (() => void)[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      unsubs.forEach((u) => u());
      clearTimeout(guard);
      history.lastRewardedAt = Date.now();
      loadRewarded();
      resolve(earned);
    };
    const guard = setTimeout(finish, 120_000);
    unsubs.push(ad.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => (earned = true)));
    unsubs.push(ad.addAdEventListener(m.AdEventType.CLOSED, finish));
    unsubs.push(ad.addAdEventListener(m.AdEventType.ERROR, finish));
    setRewardedLoaded(false);
    ad.show().catch(finish);
  });
}

export { AD_POLICY };
