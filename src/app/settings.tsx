import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { NeonText } from '@/components/NeonText';
import { ScreenContainer } from '@/components/ScreenContainer';
import { LinkRow, ToggleRow } from '@/components/SettingsRow';
import { APP_VERSION, PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/config/env';
import { logError } from '@/lib/log';
import { resetStats, updateSettings, useAppData } from '@/state/store';
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
  const hasRecords = useAppData((s) => s.stats.gamesPlayed > 0);

  const confirmReset = () => {
    Alert.alert('Reset records?', 'This permanently clears your best score, top 10 runs and game count on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetStats },
    ]);
  };

  return (
    <ScreenContainer title="SETTINGS" back>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section label="AUDIO AND FEEL">
          <ToggleRow label="Sound" value={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
          <ToggleRow label="Music" value={settings.music} onChange={(v) => updateSettings({ music: v })} />
          <ToggleRow label="Haptics" value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />
        </Section>

        <Section label="RECORDS">
          <LinkRow label="Reset records" onPress={hasRecords ? confirmReset : undefined} value={hasRecords ? undefined : 'Nothing saved yet'} />
        </Section>

        <Section label="PRIVACY AND INFO">
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
