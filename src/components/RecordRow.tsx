import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatScore } from '@/lib/format';
import type { RunRecord } from '@/services/storage';
import { colors, space } from '@/theme/tokens';

import { NeonText } from './NeonText';

const PODIUM = [colors.gold, colors.primary, colors.secondary];

function formatDate(at: number): string {
  if (!at) return '';
  const d = new Date(at);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Row({ rank, run, index }: { rank: number; run: RunRecord; index: number }) {
  const podium = rank <= 3 ? PODIUM[rank - 1] : undefined;
  const date = formatDate(run.at);
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 35).duration(260)}
      style={[styles.row, rank === 1 && styles.top]}
      accessible
      accessibilityLabel={`Rank ${rank}, ${run.score} points, best combo ${run.maxCombo}${date ? `, ${date}` : ''}`}
    >
      <NeonText variant="number" style={styles.rank} color={podium ?? colors.textMuted} glow={podium ? podium + '88' : undefined} glowRadius={8}>
        {rank}
      </NeonText>
      <View style={styles.meta}>
        <NeonText variant="body" numberOfLines={1} style={styles.date}>
          {date}
        </NeonText>
        <NeonText variant="caption" numberOfLines={1}>
          COMBO x{run.maxCombo}  ·  {run.hits} HITS
        </NeonText>
      </View>
      <NeonText variant="number" style={styles.score} color={rank === 1 ? colors.gold : colors.text}>
        {formatScore(run.score)}
      </NeonText>
    </Animated.View>
  );
}

export const RecordRow = memo(Row);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingHorizontal: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: space.md,
  },
  top: { backgroundColor: 'rgba(255,210,92,0.06)', borderLeftWidth: 2, borderLeftColor: colors.gold },
  rank: { width: 32, fontSize: 18 },
  meta: { flex: 1, gap: 2 },
  date: { fontSize: 15 },
  score: { fontSize: 19 },
});
