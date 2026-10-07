import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { LeaderboardRow } from '@/components/LeaderboardRow';
import { NeonText } from '@/components/NeonText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LoadingState, MessageState } from '@/components/States';
import { LEADERBOARD_ENABLED } from '@/config/env';
import { formatScore } from '@/lib/format';
import { isApiError } from '@/services/api';
import type { LeaderboardData, LeaderboardEntry } from '@/services/leaderboard';
import { cachedLeaderboard, loadLeaderboard } from '@/services/leaderboardCache';
import { syncNow } from '@/services/sync';
import { useAppData } from '@/state/store';
import { colors, radius, space } from '@/theme/tokens';

type Status = 'loading' | 'ready' | 'offline' | 'error' | 'disabled';

const SLOW_MS = 4000;
const MANUAL_REFRESH_GAP_MS = 8000;
const ROW_H = 54;

export default function LeaderboardScreen() {
  const username = useAppData((s) => s.profile?.username ?? '');
  const localBest = useAppData((s) => s.stats.best);
  const [data, setData] = useState<LeaderboardData | null>(() => cachedLeaderboard());
  const [status, setStatus] = useState<Status>(() =>
    LEADERBOARD_ENABLED ? (cachedLeaderboard() ? 'ready' : 'loading') : 'disabled',
  );
  const [slow, setSlow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const lastManual = useRef(0);

  const load = useCallback(async (force: boolean) => {
    if (!LEADERBOARD_ENABLED) return;
    const slowTimer = setTimeout(() => {
      if (mounted.current) setSlow(true);
    }, SLOW_MS);
    try {
      // Push any queued personal best first so the player sees their real position.
      await syncNow();
      const next = await loadLeaderboard(force);
      if (!mounted.current) return;
      setData(next);
      setStatus('ready');
    } catch (e) {
      if (!mounted.current) return;
      // Keep showing stale data if we have it; only fall back to an error state when there's nothing.
      if (!cachedLeaderboard()) {
        setStatus(isApiError(e, 'offline') || isApiError(e, 'timeout') ? 'offline' : 'error');
      }
    } finally {
      clearTimeout(slowTimer);
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Fetching on mount is the point of this effect; state only changes after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const retry = () => {
    setSlow(false);
    setStatus('loading');
    void load(true);
  };

  const onRefresh = () => {
    const now = Date.now();
    if (now - lastManual.current < MANUAL_REFRESH_GAP_MS) return;
    lastManual.current = now;
    setRefreshing(true);
    void load(true);
  };

  const me = data?.me ?? null;
  const isMe = (e: LeaderboardEntry) => me !== null && e.rank === me.rank && e.username === me.username;
  const meInTop = me !== null && (data?.top.some(isMe) ?? false);

  let body: React.ReactNode;
  if (status === 'disabled') {
    body = (
      <MessageState
        title="LEADERBOARD UNAVAILABLE"
        message="The global leaderboard isn't set up in this build. Your local best is still saved."
      />
    );
  } else if (status === 'loading') {
    body = <LoadingState slow={slow} />;
  } else if (status === 'offline') {
    body = (
      <MessageState
        title="YOU'RE OFFLINE"
        message="Leaderboard unavailable offline. Your local high score is still safe."
        actionLabel="RETRY"
        onAction={retry}
      />
    );
  } else if (status === 'error') {
    body = (
      <MessageState
        title="LEADERBOARD UNAVAILABLE"
        message="Leaderboard unavailable right now. Try again in a moment."
        actionLabel="RETRY"
        onAction={retry}
        tone="accent"
      />
    );
  } else if (!data || data.top.length === 0) {
    body = <MessageState title="NO SCORES YET" message="Be the first to set the record." />;
  } else {
    body = (
      <FlatList
        data={data.top}
        keyExtractor={(e) => `${e.rank}:${e.username}`}
        renderItem={({ item, index }) => <LeaderboardRow {...item} index={index} isMe={isMe(item)} />}
        getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
        initialNumToRender={14}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <NeonText variant="label" style={styles.listHeader}>
            TOP PLAYERS
          </NeonText>
        }
        ListFooterComponent={
          me && !meInTop ? (
            <View style={styles.footer}>
              <View style={styles.gap}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
              <LeaderboardRow rank={me.rank} username={me.username} score={me.score} isMe />
            </View>
          ) : (
            <View style={styles.spacer} />
          )
        }
      />
    );
  }

  return (
    <ScreenContainer title="LEADERBOARD" back>
      <YourPosition username={username} me={me} localBest={localBest} online={status === 'ready'} />
      {body}
    </ScreenContainer>
  );
}

function YourPosition({
  username,
  me,
  localBest,
  online,
}: {
  username: string;
  me: LeaderboardEntry | null;
  localBest: number;
  online: boolean;
}) {
  const best = Math.max(localBest, me?.score ?? 0);
  let caption = 'Play a run to get ranked';
  if (me) caption = username;
  else if (!online) caption = 'Rank shows when online';
  else if (best > 0) caption = 'Syncing your best...';
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Your position ${me ? `rank ${me.rank}` : 'unranked'}, best ${best}`}
    >
      <View style={styles.cardCol}>
        <NeonText variant="label">YOUR POSITION</NeonText>
        <NeonText
          variant="number"
          style={styles.rank}
          color={me ? colors.primary : colors.textFaint}
          glow={me ? 'rgba(60,240,255,0.5)' : undefined}
        >
          {me ? `#${formatScore(me.rank)}` : '--'}
        </NeonText>
        <NeonText variant="caption" numberOfLines={1}>
          {caption}
        </NeonText>
      </View>
      <View style={[styles.cardCol, styles.right]}>
        <NeonText variant="label">YOUR BEST</NeonText>
        <NeonText variant="number" style={styles.rank}>
          {formatScore(best)}
        </NeonText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.primaryDim,
    borderRadius: radius.md,
    backgroundColor: 'rgba(60,240,255,0.04)',
    marginBottom: space.lg,
  },
  cardCol: { flex: 1, gap: 4 },
  right: { alignItems: 'flex-end' },
  rank: { fontSize: 26 },
  listHeader: { marginBottom: space.xs },
  footer: { marginTop: space.sm, marginBottom: space.xl },
  gap: { alignItems: 'center', gap: 4, paddingVertical: space.sm },
  dot: { width: 3, height: 3, backgroundColor: colors.textFaint },
  spacer: { height: space.xl },
});
