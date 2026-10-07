import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useGuardedPress } from '@/lib/useGuardedPress';
import { play } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { colors, fonts, glow, radius } from '@/theme/tokens';

import { NeonText } from './NeonText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  size?: 'lg' | 'md';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  /** Small line under the label, e.g. "WATCH AD". */
  sublabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GameButton({ label, onPress, variant = 'secondary', disabled, size = 'md', style, accessibilityHint, sublabel }: Props) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.get() * 0.04 }],
  }));
  const handle = useGuardedPress(() => {
    if (disabled) return;
    play('click');
    haptic('tap');
    onPress();
  });

  const v = VARIANT_STYLES[variant];
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={() => pressed.set(withTiming(1, { duration: 70 }))}
      onPressOut={() => pressed.set(withSpring(0, { damping: 12, stiffness: 320 }))}
      onPress={handle}
      disabled={disabled}
      hitSlop={6}
      style={[styles.base, size === 'lg' ? styles.lg : styles.md, v.box, disabled && styles.disabled, animated, style]}
    >
      <View style={styles.inner}>
        <NeonText
          style={[styles.label, size === 'lg' && styles.labelLg, { color: v.text }]}
          glow={variant === 'primary' ? undefined : v.glow}
          glowRadius={8}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </NeonText>
        {sublabel ? (
          <NeonText variant="label" style={[styles.sub, { color: v.text }]} numberOfLines={1}>
            {sublabel}
          </NeonText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const VARIANT_STYLES: Record<Variant, { box: ViewStyle; text: string; glow?: string }> = {
  primary: {
    box: { backgroundColor: colors.primary, borderColor: colors.primary, boxShadow: glow('rgba(60,240,255,0.55)', 24) },
    text: colors.onPrimary,
  },
  secondary: {
    box: { backgroundColor: 'rgba(60,240,255,0.04)', borderColor: colors.primaryDim },
    text: colors.primary,
    glow: 'rgba(60,240,255,0.5)',
  },
  ghost: { box: { backgroundColor: 'transparent', borderColor: colors.line }, text: colors.textMuted },
  danger: {
    box: { backgroundColor: 'rgba(255,61,184,0.06)', borderColor: colors.accent },
    text: colors.accent,
    glow: 'rgba(255,61,184,0.5)',
  },
};

const styles = StyleSheet.create({
  base: { borderWidth: 1.5, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
  lg: { minHeight: 68, paddingHorizontal: 24 },
  md: { minHeight: 54, paddingHorizontal: 12 },
  inner: { alignItems: 'center' },
  label: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 2.5 },
  labelLg: { fontSize: 22, letterSpacing: 6 },
  sub: { marginTop: 2, fontSize: 10, opacity: 0.8 },
  disabled: { opacity: 0.35 },
});
