import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { NeonText } from '@/components/NeonText';
import { RecordRow } from '@/components/RecordRow';
import { ScreenContainer } from '@/components/ScreenContainer';
import { MessageState } from '@/components/States';
import { formatScore } from '@/lib/format';
import { useAppData } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

/** Personal top 10, stored only on this device. */
export default function RecordsScreen() {
  const stats = useAppData((s) => s.stats);

  return (
    <ScreenContainer title="RECORDS" back>
      <View style={styles.card} accessible accessibilityLabel={`Best ${stats.best}, best combo ${stats.bestCombo}, ${stats.gamesPlayed} games played`}>
        <Stat label="BEST" value={formatScore(stats.best)} highlight />
        <View style={styles.divider} />
        <Stat label="COMBO" value={`x${stats.bestCombo}`} />
        <View style={styles.divider} />
        <Stat label="GAMES" value={formatScore(stats.gamesPlayed)} />
      </View>

      {stats.topRuns.length === 0 ? (
        <MessageState
          title="NO RUNS YET"
          message="Your 10 best runs will be kept here."
          actionLabel="PLAY"
          onAction={() => router.replace('/game')}
        />
      ) : (
        <FlatList
          data={stats.topRuns}
          keyExtractor={(r, i) => `${r.at}:${r.score}:${i}`}
          renderItem={({ item, index }) => <RecordRow rank={index + 1} run={item} index={index} />}
          ListHeaderComponent={
            <NeonText variant="label" style={styles.listHeader}>
              YOUR TOP {stats.topRuns.length}
            </NeonText>
          }
          ListFooterComponent={
            <NeonText variant="caption" color={colors.textFaint} style={styles.footer}>
              Records are saved on this device only.
            </NeonText>
          }
        />
      )}
    </ScreenContainer>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <NeonText variant="label">{label}</NeonText>
      <NeonText
        variant="number"
        style={styles.statValue}
        color={highlight ? colors.primary : colors.text}
        glow={highlight ? 'rgba(60,240,255,0.5)' : undefined}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.primaryDim,
    borderRadius: radius.md,
    backgroundColor: 'rgba(60,240,255,0.04)',
    marginBottom: space.lg,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  statValue: { fontSize: 22 },
  divider: { width: 1, backgroundColor: colors.line },
  listHeader: { marginBottom: space.xs },
  footer: { textAlign: 'center', marginVertical: space.xl },
});
