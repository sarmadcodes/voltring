import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuardedPress } from '@/lib/useGuardedPress';
import { play } from '@/services/audio';
import { colors, space } from '@/theme/tokens';

import { Backdrop } from './Backdrop';
import { NeonText } from './NeonText';

interface Props {
  title?: string;
  children: ReactNode;
  /** Shows a BACK control in the header. */
  back?: boolean;
  ambient?: boolean;
  padded?: boolean;
}

export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function ScreenContainer({ title, children, back, ambient, padded = true }: Props) {
  const insets = useSafeAreaInsets();
  const onBack = useGuardedPress(() => {
    play('click');
    goBackOrHome();
  });
  return (
    <View style={styles.root}>
      <Backdrop ambient={ambient} />
      <View style={[styles.content, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom }, padded && styles.padded]}>
        {title || back ? (
          <View style={styles.header}>
            {back ? (
              <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
                <View style={styles.chevron} />
                <NeonText variant="label" color={colors.primary}>
                  BACK
                </NeonText>
              </Pressable>
            ) : null}
            {title ? (
              <NeonText variant="heading" glow="rgba(60,240,255,0.45)" accessibilityRole="header" style={styles.title}>
                {title}
              </NeonText>
            ) : null}
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  padded: { paddingHorizontal: space.lg },
  header: { paddingTop: space.sm, paddingBottom: space.md, gap: space.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 6 },
  chevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  title: { fontSize: 26 },
});
