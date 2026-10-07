import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** The app mark in motion: a spark circling the ring through its gate. */
export function LogoMark({ size = 120 }: { size?: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.set(withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [t, reduce]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.get() * 360 + 20}deg` }] }));

  const c = size / 2;
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.16;
  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={colors.primary} strokeOpacity={0.12} strokeWidth={size * 0.12} fill="none" />
        <Circle cx={c} cy={c} r={r} stroke={colors.primary} strokeWidth={size * 0.035} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={colors.accent}
          strokeWidth={size * 0.09}
          fill="none"
          strokeDasharray={`${arc} ${circ}`}
          transform={`rotate(${-90 - 28.8 + 135} ${c} ${c})`}
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <View
          style={{
            position: 'absolute',
            left: c - size * 0.07,
            top: c - r - size * 0.07,
            width: size * 0.14,
            height: size * 0.14,
            borderRadius: size * 0.07,
            backgroundColor: '#E9FDFF',
            boxShadow: '0 0 14px 3px rgba(60,240,255,0.8)',
          }}
        />
      </Animated.View>
    </View>
  );
}
