import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { play } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { colors, radius, space } from '@/theme/tokens';

import { NeonText } from './NeonText';

const TRACK_W = 52;
const KNOB = 22;

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? TRACK_W - KNOB - 6 : 0, { duration: 140 }) }],
    backgroundColor: withTiming(value ? colors.primary : colors.textFaint, { duration: 140 }),
  }));
  return (
    <Pressable
      style={styles.row}
      onPress={() => {
        // Setting updates first, so muting sound also silences this click.
        onChange(!value);
        play('click');
        haptic('tap');
      }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <NeonText variant="body" style={styles.label}>
        {label}
      </NeonText>
      <NeonText variant="label" color={value ? colors.primary : colors.textFaint} style={styles.state}>
        {value ? 'ON' : 'OFF'}
      </NeonText>
      <View style={[styles.track, value && styles.trackOn]}>
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </Pressable>
  );
}

export function LinkRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable
      style={styles.row}
      onPress={
        onPress
          ? () => {
              play('click');
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      <NeonText variant="body" style={styles.label}>
        {label}
      </NeonText>
      {value ? (
        <NeonText variant="body" color={colors.textMuted} numberOfLines={1} style={styles.value}>
          {value}
        </NeonText>
      ) : null}
      {onPress ? <View style={styles.chevron} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    gap: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: { flex: 1 },
  value: { maxWidth: '50%' },
  state: { width: 30, textAlign: 'right' },
  track: {
    width: TRACK_W,
    height: KNOB + 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: 2.5,
    justifyContent: 'center',
  },
  trackOn: { borderColor: colors.primaryDim },
  knob: { width: KNOB, height: KNOB, borderRadius: radius.sm },
  chevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.textMuted,
    transform: [{ rotate: '45deg' }],
  },
});
