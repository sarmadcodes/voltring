import { ScrollView, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/LogoMark';
import { NeonText } from '@/components/NeonText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { APP_VERSION } from '@/config/env';
import { colors, space } from '@/theme/tokens';

const RULES: { title: string; body: string }[] = [
  { title: 'TAP IN THE GATE', body: 'A spark circles the ring. Tap anywhere while it is inside the glowing gate.' },
  { title: 'CHAIN HITS', body: 'Every 4 hits in a row raise your multiplier, up to x8. A miss resets it.' },
  { title: 'AIM FOR CENTER', body: 'The white core of a gate is a PERFECT hit and scores double. Gold gates score triple.' },
  { title: 'THREE LIVES', body: 'Tapping too early or letting the spark slip past costs a life. The ring speeds up as you score.' },
];

export default function AboutScreen() {
  return (
    <ScreenContainer title="ABOUT" back>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LogoMark size={72} />
          <View>
            <NeonText variant="heading">VOLTRING</NeonText>
            <NeonText variant="caption">Version {APP_VERSION}</NeonText>
          </View>
        </View>

        {RULES.map((r) => (
          <View key={r.title} style={styles.rule}>
            <NeonText variant="label" color={colors.primary}>
              {r.title}
            </NeonText>
            <NeonText variant="body" color={colors.textMuted}>
              {r.body}
            </NeonText>
          </View>
        ))}

        <NeonText variant="caption" style={styles.credits}>
          All graphics, sounds and music are original to VOLTRING. Fonts: Orbitron and Chakra Petch, used under the SIL Open Font
          License 1.1.
        </NeonText>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxl, gap: space.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  rule: { gap: 6 },
  credits: { marginTop: space.lg },
});
