import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatScore } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

import { GameButton } from '../GameButton';
import { NeonText } from '../NeonText';

function Scrim({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(100)}
      style={[styles.scrim, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }]}
    >
      {children}
    </Animated.View>
  );
}

export function Countdown({ value }: { value: string }) {
  return (
    <View style={styles.countdown} pointerEvents="none">
      <Animated.View key={value} entering={ZoomIn.duration(180)}>
        <NeonText variant="title" style={styles.countText} glow="rgba(60,240,255,0.7)" glowRadius={20}>
          {value}
        </NeonText>
      </Animated.View>
    </View>
  );
}

export function PausePanel({ onResume, onRestart, onHome }: { onResume: () => void; onRestart: () => void; onHome: () => void }) {
  return (
    <Scrim>
      <View style={styles.panel}>
        <NeonText variant="title" style={styles.title} glow="rgba(60,240,255,0.5)" accessibilityRole="header">
          PAUSED
        </NeonText>
        <View style={styles.actions}>
          <GameButton label="RESUME" variant="primary" size="lg" onPress={onResume} />
          <GameButton label="RESTART" onPress={onRestart} />
          <GameButton label="HOME" variant="ghost" onPress={onHome} />
        </View>
      </View>
    </Scrim>
  );
}

interface GameOverProps {
  score: number;
  best: number;
  maxCombo: number;
  newBest: boolean;
  rankText: string;
  syncNote: string | null;
  canContinue: boolean;
  onContinue: () => void;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
  onHome: () => void;
}

export function GameOverPanel(p: GameOverProps) {
  // Buttons arm after a beat so frantic taps from the last moment of play can't hit them.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 550);
    return () => clearTimeout(t);
  }, []);

  return (
    <Scrim>
      <View style={styles.panel}>
        {p.newBest ? <NewRecord /> : (
          <NeonText variant="heading" color={colors.accent} glow="rgba(255,61,184,0.5)" style={styles.over} accessibilityRole="header">
            GAME OVER
          </NeonText>
        )}

        <View style={styles.scoreBlock} accessible accessibilityLabel={`Final score ${p.score}`}>
          <NeonText variant="label">SCORE</NeonText>
          <NeonText variant="number" style={styles.bigScore} glow="rgba(60,240,255,0.5)" glowRadius={16}>
            {formatScore(p.score)}
          </NeonText>
        </View>

        <View style={styles.stats}>
          <Stat label="BEST" value={formatScore(p.best)} />
          <View style={styles.divider} />
          <Stat label="COMBO" value={`x${p.maxCombo}`} />
          <View style={styles.divider} />
          <Stat label="RANK" value={p.rankText} />
        </View>
        {p.syncNote ? (
          <NeonText variant="caption" style={styles.note}>
            {p.syncNote}
          </NeonText>
        ) : null}

        <View style={styles.actions}>
          {p.canContinue ? (
            <GameButton label="CONTINUE" sublabel="WATCH AD FOR 1 LIFE" variant="danger" onPress={p.onContinue} disabled={!armed} />
          ) : null}
          <GameButton label="PLAY AGAIN" variant="primary" size="lg" onPress={p.onPlayAgain} disabled={!armed} />
          <View style={styles.row}>
            <GameButton label="LEADERBOARD" onPress={p.onLeaderboard} disabled={!armed} />
            <GameButton label="HOME" variant="ghost" onPress={p.onHome} disabled={!armed} />
          </View>
        </View>
      </View>
    </Scrim>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label} ${value}`}>
      <NeonText variant="label">{label}</NeonText>
      <NeonText variant="number" style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </NeonText>
    </View>
  );
}

function NewRecord() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.set(withRepeat(withTiming(1, { duration: 650 }), -1, true));
    return () => cancelAnimation(t);
  }, [t, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: 0.75 + t.get() * 0.25, transform: [{ scale: 1 + t.get() * 0.04 }] }));
  return (
    <Animated.View entering={ZoomIn.springify().damping(12)} style={style}>
      <NeonText variant="heading" color={colors.gold} glow="rgba(255,210,92,0.7)" glowRadius={16} style={styles.over} accessibilityRole="header">
        NEW HIGH SCORE
      </NeonText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6,6,11,0.9)',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  panel: { width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center' },
  title: { fontSize: 36, marginBottom: space.xl },
  over: { fontSize: 24, letterSpacing: 5, textAlign: 'center' },
  scoreBlock: { alignItems: 'center', marginTop: space.lg },
  bigScore: { fontSize: 52, marginTop: space.xs },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  statValue: { fontSize: 18 },
  divider: { width: 1, backgroundColor: colors.line },
  note: { marginTop: space.sm, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: space.sm + 4, marginTop: space.xl },
  row: { gap: space.sm + 4 },
  countdown: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 72 },
});
