import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Build-time config. APP_ENV comes from the EAS build profile (see eas.json).
 * Production builds refuse to compile with placeholder/test AdMob IDs or a missing privacy URL.
 */
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const IS_PROD = APP_ENV === 'production';

// Google's official sample AdMob app ID: safe for development/preview only.
const TEST_ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const admobAppId = process.env.ADMOB_ANDROID_APP_ID || (IS_PROD ? '' : TEST_ADMOB_APP_ID);

if (IS_PROD) {
  const missing = [
    ['ADMOB_ANDROID_APP_ID', process.env.ADMOB_ANDROID_APP_ID],
    ['EXPO_PUBLIC_ADMOB_BANNER_ANDROID', process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID],
    ['EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID', process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID],
    ['EXPO_PUBLIC_ADMOB_REWARDED_ANDROID', process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID],
    ['EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL],
    ['EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY],
    ['EXPO_PUBLIC_PRIVACY_POLICY_URL', process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL],
  ].filter(([, v]) => !v);
  if (missing.length) throw new Error(`Production build is missing: ${missing.map(([k]) => k).join(', ')}`);
  if (admobAppId.startsWith('ca-app-pub-3940256099942544')) {
    throw new Error('Production build is using the Google TEST AdMob app ID. Set ADMOB_ANDROID_APP_ID.');
  }
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'VOLTRING',
  slug: 'voltring',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'voltring',
  userInterfaceStyle: 'dark',
  backgroundColor: '#06060B',
  android: {
    package: 'com.sarmad.voltring',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#06060B',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Only INTERNET / ACCESS_NETWORK_STATE (added by AdMob) remain; nothing sensitive.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    ],
  },
  ios: { supportsTablet: false, bundleIdentifier: 'com.sarmad.voltring' },
  web: { output: 'static', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#06060B',
        image: './assets/images/splash-icon.png',
        imageWidth: 140,
      },
    ],
    [
      'expo-audio',
      { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false, enableBackgroundRecording: false },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: admobAppId,
        // iOS is not shipped; the sample ID only keeps the plugin from warning.
        iosAppId: 'ca-app-pub-3940256099942544~1458002511',
        delayAppMeasurementInit: true,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Google Play requires API 35+ for new apps from Aug 2025 and API 36 from Aug 2026.
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
    'expo-font',
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: { appEnv: APP_ENV },
});
