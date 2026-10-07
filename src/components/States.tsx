import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, space } from '@/theme/tokens';

import { GameButton } from './GameButton';
import { NeonText } from './NeonText';

/** Skeleton rows shaped like the real leaderboard, with a soft pulse instead of a spinner. */
export function LoadingState({ rows = 8, slow }: { rows?: number; slow?: boolean }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0.4);
  useEffect(() => {
    if (!reduce) t.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
    return () => cancelAnimation(t);
  }, [t, reduce]);
  const pulse = useAnimatedStyle(() => ({ opacity: t.get() }));
  return (
    <View accessibilityLabel="Fetching scores" accessibilityRole="progressbar">
      <NeonText variant="label" style={styles.loadingText}>
        {slow ? 'LEADERBOARD IS TAKING A LITTLE LONGER THAN USUAL' : 'FETCHING SCORES'}
      </NeonText>
      <Animated.View style={pulse}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={styles.skelRow}>
            <View style={[styles.skel, { width: 30 }]} />
            <View style={[styles.skel, { flex: 1, maxWidth: 140 - (i % 3) * 20 }]} />
            <View style={[styles.skel, { width: 64 }]} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function MessageState({
  title,
  message,
  actionLabel,
  onAction,
  tone = 'muted',
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'muted' | 'accent';
}) {
  return (
    <View style={styles.message}>
      <View style={[styles.mark, { borderColor: tone === 'accent' ? colors.accent : colors.primaryDim }]} />
      <NeonText variant="heading" style={styles.msgTitle}>
        {title}
      </NeonText>
      {message ? (
        <NeonText variant="caption" style={styles.msgBody}>
          {message}
        </NeonText>
      ) : null}
      {actionLabel && onAction ? <GameButton label={actionLabel} onPress={onAction} style={styles.msgBtn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingText: { marginBottom: space.md },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, height: 52, borderBottomWidth: 1, borderBottomColor: colors.line },
  skel: { height: 12, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  message: { alignItems: 'center', paddingVertical: space.xxl, gap: space.sm },
  mark: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, marginBottom: space.md },
  msgTitle: { fontSize: 17, textAlign: 'center' },
  msgBody: { textAlign: 'center', maxWidth: 280 },
  msgBtn: { marginTop: space.lg, alignSelf: 'center', minWidth: 180 },
});
