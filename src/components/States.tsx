import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { GameButton } from './GameButton';
import { NeonText } from './NeonText';

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
  message: { alignItems: 'center', paddingVertical: space.xxl, gap: space.sm },
  mark: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, marginBottom: space.md },
  msgTitle: { fontSize: 17, textAlign: 'center' },
  msgBody: { textAlign: 'center', maxWidth: 280 },
  msgBtn: { marginTop: space.lg, alignSelf: 'center', minWidth: 180 },
});
