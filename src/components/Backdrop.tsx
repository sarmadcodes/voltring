import { memo, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/**
 * Static vector backdrop (grid + scanlines + vignette) drawn once, plus an optional
 * handful of drifting motes. No bitmaps, nothing re-renders per frame.
 */
function BackdropImpl({ ambient = false }: { ambient?: boolean }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="grid" width={36} height={36} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={36} y2={0} stroke={colors.primary} strokeOpacity={0.045} strokeWidth={1} />
            <Line x1={0} y1={0} x2={0} y2={36} stroke={colors.primary} strokeOpacity={0.045} strokeWidth={1} />
          </Pattern>
          <Pattern id="scan" width={4} height={4} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0.5} x2={4} y2={0.5} stroke="#000" strokeOpacity={0.28} strokeWidth={1} />
          </Pattern>
          <RadialGradient id="glow" cx="50%" cy="42%" rx="70%" ry="50%">
            <Stop offset="0" stopColor={colors.secondary} stopOpacity={0.12} />
            <Stop offset="0.6" stopColor={colors.primary} stopOpacity={0.03} />
            <Stop offset="1" stopColor={colors.background} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill={colors.background} />
        <Rect width={width} height={height} fill="url(#glow)" />
        <Rect width={width} height={height} fill="url(#grid)" />
        <Rect width={width} height={height} fill="url(#scan)" />
      </Svg>
      {ambient && !reduceMotion ? <Ambient width={width} height={height} /> : null}
    </View>
  );
}

const MOTES = [
  { x: 0.12, size: 3, dur: 14000, delay: 0, color: colors.primary },
  { x: 0.3, size: 2, dur: 18000, delay: 3000, color: colors.secondary },
  { x: 0.55, size: 3, dur: 16000, delay: 7000, color: colors.primary },
  { x: 0.72, size: 2, dur: 20000, delay: 1500, color: colors.accent },
  { x: 0.88, size: 3, dur: 15000, delay: 9000, color: colors.secondary },
  { x: 0.42, size: 2, dur: 22000, delay: 12000, color: colors.primary },
];

function Ambient({ width, height }: { width: number; height: number }) {
  return (
    <>
      <ScanBand height={height} />
      {MOTES.map((m, i) => (
        <Mote key={i} {...m} x={m.x * width} height={height} />
      ))}
    </>
  );
}

function ScanBand({ height }: { height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -80 + t.get() * (height + 160) }] }));
  return <Animated.View style={[styles.band, style]} />;
}

function Mote({ x, size, dur, delay, color, height }: { x: number; size: number; dur: number; delay: number; color: string; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false)));
    return () => cancelAnimation(t);
  }, [t, delay, dur]);
  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: p < 0.1 ? p * 6 : p > 0.85 ? (1 - p) * 4 : 0.6,
      transform: [{ translateY: height * (1 - p) }, { translateX: Math.sin(p * 6.28) * 12 }],
    };
  });
  return (
    <Animated.View
      style={[styles.mote, { left: x, width: size, height: size, backgroundColor: color, boxShadow: `0 0 8px 1px ${color}` }, style]}
    />
  );
}

export const Backdrop = memo(BackdropImpl);

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, height: 80, backgroundColor: 'rgba(60,240,255,0.025)' },
  mote: { position: 'absolute', top: 0, borderRadius: 2 },
});
