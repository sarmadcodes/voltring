import Constants from 'expo-constants';

/**
 * Only EXPO_PUBLIC_* values end up in the JS bundle. Everything here is public by
 * design (Supabase anon key is meant to ship; RLS + RPC checks protect the data).
 * Never add a service-role key or any other secret to this file or to .env.
 */
type AppEnv = 'development' | 'preview' | 'production';

function str(v: string | undefined): string {
  return typeof v === 'string' ? v.trim() : '';
}

const rawEnv = str(process.env.EXPO_PUBLIC_APP_ENV);
export const APP_ENV: AppEnv =
  rawEnv === 'production' || rawEnv === 'preview' ? rawEnv : 'development';
export const IS_PRODUCTION = APP_ENV === 'production' && !__DEV__;

export const SUPABASE_URL = str(process.env.EXPO_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = str(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
export const LEADERBOARD_ENABLED = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;

export const ADMOB_UNITS = {
  banner: str(process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID),
  interstitial: str(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID),
  rewarded: str(process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID),
};

export const PRIVACY_POLICY_URL = str(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL);
export const TERMS_URL = str(process.env.EXPO_PUBLIC_TERMS_URL);
export const SUPPORT_EMAIL = str(process.env.EXPO_PUBLIC_SUPPORT_EMAIL);

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
