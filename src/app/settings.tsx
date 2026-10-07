import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { NeonText } from '@/components/NeonText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LinkRow, ToggleRow } from '@/components/SettingsRow';
import { APP_VERSION, PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/config/env';
import { logError } from '@/lib/log';
import { isPrivacyOptionsRequired, showPrivacyOptions } from '@/services/ads';
import { invalidateLeaderboard } from '@/services/leaderboardCache';
import { deletePlayer } from '@/services/player';
import { getState, setProfile, setState, setStats, updateSettings, useAppData } from '@/state/store';
import { colors, space } from '@/theme/tokens';

async function openUrl(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor: colors.background, controlsColor: colors.primary });
  } catch (e) {
    logError('settings.open', e);
  }
}

export default function SettingsScreen() {
  const settings = useAppData((s) => s.settings);
  const profile = useAppData((s) => s.profile);
  const [deleting, setDeleting] = useState(false);

  const resetIdentity = () => {
    const stats = getState().stats;
    setStats({ ...stats, syncedBest: 0, pending: null });
    setState({ rank: null });
    invalidateLeaderboard();
    setProfile(null);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete leaderboard data?',
      'This removes your name and best score from the global leaderboard. Your local best on this device is kept. You will choose a new name afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            const p = getState().profile;
            if (!p) return;
            if (!p.playerId) {
              resetIdentity();
              return;
            }
            setDeleting(true);
            try {
              await deletePlayer(p.playerId, p.secret);
              resetIdentity();
            } catch (e) {
              logError('settings.delete', e);
              Alert.alert("Couldn't delete right now", 'Check your connection and try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer title="SETTINGS" back>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section label="AUDIO AND FEEL">
          <ToggleRow label="Sound" value={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
          <ToggleRow label="Music" value={settings.music} onChange={(v) => updateSettings({ music: v })} />
          <ToggleRow label="Haptics" value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />
        </Section>

        <Section label="PLAYER">
          <LinkRow label="Username" value={profile?.username} />
          <LinkRow label="Change username" onPress={() => router.push({ pathname: '/name', params: { mode: 'change' } })} />
          <LinkRow label={deleting ? 'Deleting...' : 'Delete leaderboard data'} onPress={deleting ? undefined : confirmDelete} />
        </Section>

        <Section label="PRIVACY AND INFO">
          {isPrivacyOptionsRequired() ? <LinkRow label="Ad privacy choices" onPress={() => void showPrivacyOptions()} /> : null}
          {PRIVACY_POLICY_URL ? <LinkRow label="Privacy policy" onPress={() => void openUrl(PRIVACY_POLICY_URL)} /> : null}
          {TERMS_URL ? <LinkRow label="Terms" onPress={() => void openUrl(TERMS_URL)} /> : null}
          {SUPPORT_EMAIL ? (
            <LinkRow label="Contact support" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => undefined)} />
          ) : null}
          <LinkRow label="About" onPress={() => router.push('/about')} />
        </Section>

        <NeonText variant="caption" color={colors.textFaint} style={styles.version}>
          VOLTRING {APP_VERSION}
        </NeonText>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <NeonText variant="label" style={styles.sectionLabel}>
        {label}
      </NeonText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxl },
  section: { marginBottom: space.xl },
  sectionLabel: { marginBottom: space.xs },
  version: { textAlign: 'center', marginTop: space.md },
});
