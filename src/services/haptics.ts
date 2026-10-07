import * as Haptics from 'expo-haptics';

import { getState } from '@/state/store';

type Kind = 'tap' | 'hit' | 'milestone' | 'miss' | 'gameover';

/** Used sparingly: one pulse per meaningful event, never continuous. */
export function haptic(kind: Kind): void {
  if (!getState().settings.haptics) return;
  const run = (p: Promise<void>) => p.catch(() => undefined);
  switch (kind) {
    case 'tap':
      return void run(Haptics.selectionAsync());
    case 'hit':
      return void run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    case 'milestone':
      return void run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    case 'miss':
      return void run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    case 'gameover':
      return void run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  }
}
