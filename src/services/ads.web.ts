// Web build (QA preview only): AdMob is Android-native, so every ad call is a no-op.
export { AD_POLICY } from './adPolicy';
export const adUnit = (_kind: 'banner' | 'interstitial' | 'rewarded'): string | null => null;
export const adsReady = () => false;
export const onAdsReady = (_cb: () => void) => () => undefined;
export const isPrivacyOptionsRequired = () => false;
export const initAds = async () => undefined;
export const showPrivacyOptions = async () => undefined;
export const noteGameCompleted = () => undefined;
export const maybeShowInterstitial = async () => undefined;
export const isRewardedReady = () => false;
export const onRewardedReadyChange = (_cb: (ready: boolean) => void) => () => undefined;
export const showRewarded = async () => false;
