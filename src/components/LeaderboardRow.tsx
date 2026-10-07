import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatScore } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

import { NeonText } from './NeonText';

const PODIUM = [colors.gold, colors.primary, colors.secondary];

interface Props {
  rank: number;
  username: string;
  score: number;
  isMe?: boolean;
  index?: number;
}

function Row({ rank, username, score, isMe, index = 0 }: Props) {
  const podium = rank <= 3 ? PODIUM[rank - 1] : undefined;
  return (
    <Animated.View
      entering={index < 14 ? FadeInDown.delay(index * 28).duration(260) : undefined}
      style={[styles.row, isMe && styles.me]}
      accessible
      accessibilityLabel={`Rank ${rank}, ${isMe ? 'you, ' : ''}${username}, ${score} points`}
    >
      <NeonText variant="number" style={styles.rank} color={podium ?? colors.textMuted} glow={podium ? podium + '88' : undefined} glowRadius={8}>
        {rank}
      </NeonText>
      <View style={styles.nameWrap}>
        <NeonText variant="body" numberOfLines={1} color={isMe ? colors.primary : colors.text} style={styles.name}>
          {username}
        </NeonText>
        {isMe ? (
          <NeonText variant="label" color={colors.primary} style={styles.you}>
            YOU
          </NeonText>
        ) : null}
      </View>
      <NeonText variant="number" style={styles.score} color={isMe ? colors.primary : colors.text}>
        {formatScore(score)}
      </NeonText>
    </Animated.View>
  );
}

export const LeaderboardRow = memo(Row);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: space.md,
  },
  me: { backgroundColor: 'rgba(60,240,255,0.07)', borderLeftWidth: 2, borderLeftColor: colors.primary },
  rank: { width: 44, fontSize: 15 },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { fontSize: 16, flexShrink: 1 },
  you: { fontSize: 10 },
  score: { fontSize: 15 },
});
