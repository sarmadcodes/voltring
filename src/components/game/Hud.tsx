import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { padScore } from '@/lib/format';
import { START_LIVES, multiplierForCombo } from '@/game/rules';
import { colors, space } from '@/theme/tokens';

import { NeonText } from '../NeonText';

/** A tiny scale pop whenever `trigger` changes. Short so it never fights readability. */
function usePop(trigger: number, amount = 0.08) {
  const s = useSharedValue(0);
  useEffect(() => {
    if (trigger > 0) s.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 160 })));
  }, [trigger, s]);
  return useAnimatedStyle(() => ({ transform: [{ scale: 1 + s.get() * amount }] }));
}

export const ScoreDisplay = memo(function ScoreDisplay({ score, best }: { score: number; best: number }) {
  const pop = usePop(score);
  return (
    <View style={styles.scoreRow}>
      <View accessible accessibilityLabel={`Score ${score}`}>
        <NeonText variant="label">SCORE</NeonText>
        <Animated.View style={[styles.origin, pop]}>
          <NeonText variant="number" style={styles.score} glow="rgba(60,240,255,0.55)">
            {padScore(score)}
          </NeonText>
        </Animated.View>
      </View>
      <View style={styles.right} accessible accessibilityLabel={`Best ${Math.max(best, score)}`}>
        <NeonText variant="label">BEST</NeonText>
        <NeonText variant="number" style={styles.best} color={score > best && best > 0 ? colors.gold : colors.textMuted}>
          {padScore(Math.max(best, score))}
        </NeonText>
      </View>
    </View>
  );
});

export const LivesDisplay = memo(function LivesDisplay({ lives }: { lives: number }) {
  return (
    <View style={styles.lives} accessible accessibilityLabel={`${lives} lives left`}>
      {Array.from({ length: START_LIVES }, (_, i) => (
        <View key={i} style={[styles.pip, i < lives ? styles.pipOn : styles.pipOff]} />
      ))}
    </View>
  );
});

/**
 * Visual only for touch: the playfield gesture owns the touch and routes this box to pause.
 * Screen readers still activate it directly.
 */
export const PauseButton = memo(function PauseButton({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={styles.pause}
      pointerEvents="none"
      accessible
      accessibilityRole="button"
      accessibilityLabel="Pause"
      onAccessibilityTap={onPress}
    >
      <View style={styles.bar} />
      <View style={styles.bar} />
    </View>
  );
});

/** Lives in the middle of the ring: the multiplier is what the player is protecting. */
export const ComboDisplay = memo(function ComboDisplay({ combo }: { combo: number }) {
  const mult = multiplierForCombo(combo);
  const pop = usePop(combo, 0.14);
  const hot = mult >= 4;
  return (
    <View style={styles.center} pointerEvents="none" accessible accessibilityLabel={`Combo ${combo}, multiplier ${mult}`}>
      <Animated.View style={pop}>
        <NeonText
          variant="number"
          style={styles.mult}
          color={hot ? colors.accent : combo > 0 ? colors.text : colors.textFaint}
          glow={hot ? 'rgba(255,61,184,0.6)' : undefined}
        >
          x{mult}
        </NeonText>
      </Animated.View>
      <NeonText variant="label" color={combo > 0 ? colors.textMuted : colors.textFaint}>
        COMBO {combo}
      </NeonText>
    </View>
  );
});

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  origin: { transformOrigin: 'left center' },
  score: { fontSize: 34, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  best: { fontSize: 16, marginTop: 4 },
  lives: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  pip: { width: 12, height: 12, transform: [{ rotate: '45deg' }], borderWidth: 2 },
  pipOn: { backgroundColor: colors.primary, borderColor: colors.primary, boxShadow: '0 0 8px 1px rgba(60,240,255,0.6)' },
  pipOff: { borderColor: colors.textFaint },
  pause: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 4,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: { width: 4, height: 16, backgroundColor: colors.textMuted, borderRadius: 1 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  mult: { fontSize: 46 },
});
