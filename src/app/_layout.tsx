import { ChakraPetch_500Medium, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { Orbitron_800ExtraBold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAds } from '@/services/ads';
import { initAudio, setAppActive, setMusicWanted, syncMusic } from '@/services/audio';
import { syncNow } from '@/services/sync';
import { hydrate, subscribe, useAppData } from '@/state/store';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Orbitron_800ExtraBold,
    Orbitron_900Black,
    ChakraPetch_500Medium,
    ChakraPetch_700Bold,
  });
  const ready = useAppData((s) => s.ready);
  const hasProfile = useAppData((s) => s.profile !== null);

  useEffect(() => {
    void hydrate();
  }, []);

  // Fonts failing to load is not fatal; fall through with system fonts.
  const appReady = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (!appReady) return;
    void SplashScreen.hideAsync().catch(() => undefined);
    // Everything network- or native-heavy starts after first paint, never blocking PLAY.
    void initAudio().then(() => setMusicWanted(true));
    void syncNow();
  }, [appReady]);

  // Consent and ads only after the player has a name, so the consent form never collides with onboarding.
  useEffect(() => {
    if (appReady && hasProfile) void initAds();
  }, [appReady, hasProfile]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      if (state === 'active') void syncNow();
    });
    // Toggling music in settings takes effect immediately.
    const unsub = subscribe(syncMusic);
    return () => {
      sub.remove();
      unsub();
    };
  }, []);

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
            animationDuration: 160,
          }}
        >
          <Stack.Protected guard={hasProfile}>
            <Stack.Screen name="index" />
            <Stack.Screen name="game" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="about" />
          </Stack.Protected>
          <Stack.Screen name="name" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
