import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Build-time config. APP_ENV comes from the EAS build profile (see eas.json).
 * The game is fully offline: no backend, no ads, no keys. Production only needs the
 * privacy policy URL (Play requires one), and refuses to build without it.
 */
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

// Checked only on the EAS build worker: the CLI also evaluates this file locally before
// EAS environment variables are loaded, where the value is legitimately absent.
if (APP_ENV === 'production' && process.env.EAS_BUILD === 'true' && !process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL) {
  throw new Error('Production build is missing EXPO_PUBLIC_PRIVACY_POLICY_URL');
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
    // The app needs no permissions beyond VIBRATE (haptics); block anything libraries might add.
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
  owner: 'sarmadcodess',
  extra: { appEnv: APP_ENV, eas: { projectId: 'db215ecf-47c5-48ce-b42b-042faf7d610d' } },
});
