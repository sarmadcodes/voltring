import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GameButton } from '@/components/GameButton';
import { LogoMark } from '@/components/LogoMark';
import { NeonText } from '@/components/NeonText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { formatScore } from '@/lib/format';
import { useAppData } from '@/state/store';
import { colors, space } from '@/theme/tokens';

export default function Home() {
  const { width } = useWindowDimensions();
  // Title scales with the screen so it never clips on 320dp phones.
  const titleSize = Math.min(46, Math.floor(width / 9.2));
  const best = useAppData((s) => s.stats.best);

  return (
    <ScreenContainer ambient>
      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.logo}>
          <LogoMark size={128} />
          <NeonText variant="title" glow="rgba(60,240,255,0.55)" glowRadius={18} style={[styles.title, { fontSize: titleSize }]} accessibilityRole="header">
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
        <GameButton label="PLAY" variant="primary" size="lg" onPress={() => router.push('/game')} accessibilityHint="Starts a new run" />
        <View style={styles.row}>
          <GameButton label="RECORDS" onPress={() => router.push('/records')} accessibilityHint="Opens your best runs" style={styles.flex} />
          <GameButton label="SETTINGS" variant="ghost" onPress={() => router.push('/settings')} style={styles.flex} />
        </View>
      </Animated.View>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, paddingTop: space.lg, justifyContent: 'center', alignItems: 'center', gap: space.xl },
  logo: { alignItems: 'center', gap: space.lg },
  title: { letterSpacing: 6 },
  best: { alignItems: 'center', gap: 4 },
  bestValue: { fontSize: 30 },
  actions: { gap: space.md, paddingBottom: space.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
