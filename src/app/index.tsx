import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AdBanner } from '@/components/AdBanner';
import { GameButton } from '@/components/GameButton';
import { LogoMark } from '@/components/LogoMark';
import { NeonText } from '@/components/NeonText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LEADERBOARD_ENABLED } from '@/config/env';
import { formatScore } from '@/lib/format';
import { refreshTopScore } from '@/services/leaderboardCache';
import { useAppData } from '@/state/store';
import { colors, space } from '@/theme/tokens';

export default function Home() {
  const { width } = useWindowDimensions();
  // Title scales with the screen so it never clips on 320dp phones.
  const titleSize = Math.min(46, Math.floor(width / 9.2));
  const best = useAppData((s) => s.stats.best);
  const username = useAppData((s) => s.profile?.username ?? '');
  const nameConflict = useAppData((s) => s.profile?.nameConflict ?? false);
  const topScore = useAppData((s) => s.topScore);

  useEffect(() => {
    if (LEADERBOARD_ENABLED) void refreshTopScore();
  }, []);

  return (
    <ScreenContainer ambient>
      <View style={styles.top}>
        <NeonText variant="label" numberOfLines={1}>
          PLAYER <NeonText variant="label" color={colors.text}>{username}</NeonText>
        </NeonText>
      </View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.logo}>
          <LogoMark size={128} />
          <NeonText variant="title" glow="rgba(60,240,255,0.55)" glowRadius={18} style={[styles.title, { fontSize: titleSize }]} numberOfLines={1} adjustsFontSizeToFit accessibilityRole="header">
            VOLTRING
          </NeonText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.best} accessible accessibilityLabel={`Best score ${best}`}>
          <NeonText variant="label">BEST</NeonText>
          <NeonText variant="number" style={styles.bestValue} color={best > 0 ? colors.text : colors.textFaint}>
            {formatScore(best)}
          </NeonText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(140).duration(420)} style={styles.actions}>
        {nameConflict ? (
          <NeonText variant="caption" color={colors.gold} style={styles.conflict} onPress={() => router.push({ pathname: '/name', params: { mode: 'change' } })}>
            Your name is taken on the leaderboard. Tap here to pick a new one.
          </NeonText>
        ) : null}
        <GameButton label="PLAY" variant="primary" size="lg" onPress={() => router.push('/game')} accessibilityHint="Starts a new run" />
        <View style={styles.row}>
          <GameButton label="LEADERBOARD" onPress={() => router.push('/leaderboard')} accessibilityHint="Opens the global leaderboard" />
          <GameButton label="SETTINGS" variant="ghost" onPress={() => router.push('/settings')} />
        </View>
        {topScore ? (
          <NeonText variant="label" style={styles.topScore}>
            WORLD RECORD <NeonText variant="label" color={colors.gold}>{formatScore(topScore)}</NeonText>
          </NeonText>
        ) : null}
      </Animated.View>

      <View style={styles.banner}>
        <AdBanner />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space.sm },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.xl },
  logo: { alignItems: 'center', gap: space.lg },
  title: { letterSpacing: 6 },
  best: { alignItems: 'center', gap: 4 },
  bestValue: { fontSize: 30 },
  actions: { gap: space.md, paddingBottom: space.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },
  row: { gap: space.md },
  conflict: { textAlign: 'center', marginBottom: space.xs },
  topScore: { textAlign: 'center', marginTop: space.xs },
  banner: { marginHorizontal: -space.lg, minHeight: 0 },
});
