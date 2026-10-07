import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GameButton } from '@/components/GameButton';
import { LogoMark } from '@/components/LogoMark';
import { NeonText } from '@/components/NeonText';
import { ScreenContainer, goBackOrHome } from '@/components/ScreenContainer';
import { USERNAME_MAX, usernameErrorText, validateUsername } from '@/lib/username';
import { changeUsername, createLocalProfile, syncNow } from '@/services/sync';
import { setProfile, useAppData } from '@/state/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

export default function NameScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const profile = useAppData((s) => s.profile);
  const isChange = mode === 'change' && profile !== null;
  const [value, setValue] = useState(isChange ? profile.username : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    if (saving) return;
    const result = validateUsername(value);
    if (!result.ok) {
      setError(usernameErrorText[result.error]);
      return;
    }
    setError(null);
    if (!isChange) {
      // First launch: save locally and go. Registration with the leaderboard happens in the background.
      setProfile(createLocalProfile(result.value));
      void syncNow(true);
      router.replace('/');
      return;
    }
    if (result.value === profile.username) {
      goBackOrHome();
      return;
    }
    setSaving(true);
    const res = await changeUsername(result.value);
    setSaving(false);
    if (res.ok) goBackOrHome();
    else setError(usernameErrorText[res.reason]);
  };

  return (
    <ScreenContainer back={isChange} title={isChange ? 'PLAYER NAME' : undefined}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          {!isChange ? (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.welcome}>
              <LogoMark size={88} />
              <NeonText variant="title" style={styles.title} glow="rgba(60,240,255,0.5)" accessibilityRole="header">
                WELCOME
              </NeonText>
              <NeonText variant="body" color={colors.textMuted} style={styles.center}>
                Choose your player name
              </NeonText>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <NeonText variant="label" nativeID="nameLabel" style={styles.label}>
              PLAYER NAME
            </NeonText>
            <TextInput
              value={value}
              onChangeText={(t) => {
                setValue(t);
                if (error) setError(null);
              }}
              onSubmitEditing={submit}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={USERNAME_MAX + 4}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              spellCheck={false}
              returnKeyType="done"
              placeholder="PLAYER_1"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              accessibilityLabelledBy="nameLabel"
              accessibilityHint="3 to 16 letters, numbers or underscores"
              style={[styles.input, focused && styles.inputFocused, error && styles.inputError]}
              autoFocus={!isChange}
            />
            <View style={styles.meta}>
              <NeonText variant="caption" color={error ? colors.danger : colors.textMuted} style={styles.flex} accessibilityLiveRegion="polite">
                {error ?? 'Letters, numbers and underscores.'}
              </NeonText>
              <NeonText variant="caption" color={colors.textFaint}>
                {value.trim().length}/{USERNAME_MAX}
              </NeonText>
            </View>
          </Animated.View>

          <View style={styles.notice}>
            <NeonText variant="caption">
              Your name appears publicly on the global leaderboard. Do not use your real name or anything personal.
              {isChange ? ' Names can be changed once every 24 hours.' : ''}
            </NeonText>
          </View>

          <GameButton label={saving ? 'SAVING' : isChange ? 'SAVE' : 'CONTINUE'} variant="primary" size="lg" onPress={submit} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', gap: space.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },
  welcome: { alignItems: 'center', gap: space.sm, marginBottom: space.md },
  title: { fontSize: 34, marginTop: space.md },
  center: { textAlign: 'center' },
  label: { marginBottom: space.sm },
  input: {
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    color: colors.text,
    fontFamily: fonts.number,
    fontSize: 20,
    letterSpacing: 2,
  },
  inputFocused: { borderColor: colors.primary, boxShadow: '0 0 14px 0 rgba(60,240,255,0.25)' },
  inputError: { borderColor: colors.danger },
  meta: { flexDirection: 'row', marginTop: space.sm, gap: space.sm },
  notice: { borderLeftWidth: 2, borderLeftColor: colors.secondary, paddingLeft: space.md },
});
