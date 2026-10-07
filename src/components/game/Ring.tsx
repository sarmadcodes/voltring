import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import type { EngineState } from '@/game/engine';
import { PERFECT_FRACTION } from '@/game/rules';
import { colors } from '@/theme/tokens';

interface Props {
  size: number;
  engine: SharedValue<EngineState>;
  /** Gate geometry mirrored to JS on each spawn; rotation itself is read live on the UI thread. */
  gateHalf: number;
  golden: boolean;
  /** 0..1 pulses driven from worklets for zero-latency feedback. */
  pulse: SharedValue<number>;
  burst: SharedValue<number>;
  burstAngle: SharedValue<number>;
}

const TRAIL = [1, 2, 3, 4];
const BURST_PARTS = 10;
const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

function RingImpl({ size, engine, gateHalf, golden, pulse, burst, burstAngle }: Props) {
  const c = size / 2;
  const r = size * 0.42;
  const circumference = 2 * Math.PI * r;
  const arcLen = (circumference * (gateHalf * 2)) / 360;
  const perfectLen = Math.max(arcLen * PERFECT_FRACTION, (circumference * 6) / 360);
  const gateColor = golden ? colors.gold : colors.accent;

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.get() * 0.025 }] }));
  const gateStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${engine.get().gate}deg` }] }));
  const sparkStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${engine.get().angle}deg` }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, ringStyle]} pointerEvents="none">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={colors.primary} strokeOpacity={0.08} strokeWidth={18} fill="none" />
        <Circle cx={c} cy={c} r={r} stroke={colors.primaryDim} strokeWidth={2} fill="none" />
        <Circle cx={c} cy={c} r={r * 0.78} stroke={colors.line} strokeWidth={1} fill="none" strokeDasharray="2 8" />
        {TICKS.map((deg) => {
          const a = ((deg - 90) * Math.PI) / 180;
          const inner = r + 14;
          const outer = r + (deg % 90 === 0 ? 24 : 19);
          return (
            <Line
              key={deg}
              x1={c + Math.cos(a) * inner}
              y1={c + Math.sin(a) * inner}
              x2={c + Math.cos(a) * outer}
              y2={c + Math.sin(a) * outer}
              stroke={colors.primary}
              strokeOpacity={deg % 90 === 0 ? 0.35 : 0.14}
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>

      {/* Gate: an arc centred on 12 o'clock, rotated to the live gate angle. */}
      <Animated.View style={[StyleSheet.absoluteFill, gateStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={gateColor}
            strokeOpacity={0.22}
            strokeWidth={28}
            strokeDasharray={`${arcLen} ${circumference}`}
            transform={`rotate(${-90 - gateHalf} ${c} ${c})`}
          />
          <Circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={gateColor}
            strokeWidth={12}
            strokeDasharray={`${arcLen} ${circumference}`}
            transform={`rotate(${-90 - gateHalf} ${c} ${c})`}
          />
          <Circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.85}
            strokeWidth={4}
            strokeDasharray={`${perfectLen} ${circumference}`}
            transform={`rotate(${-90 - (perfectLen / circumference) * 180} ${c} ${c})`}
          />
        </Svg>
      </Animated.View>

      {TRAIL.map((k) => (
        <TrailDot key={k} k={k} size={size} r={r} engine={engine} />
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, sparkStyle]}>
        <View style={[styles.spark, { left: c - 9, top: c - r - 9 }]} />
      </Animated.View>

      {Array.from({ length: BURST_PARTS }, (_, i) => (
        <BurstParticle key={i} i={i} c={c} r={r} burst={burst} burstAngle={burstAngle} />
      ))}
    </Animated.View>
  );
}

function TrailDot({ k, size, r, engine }: { k: number; size: number; r: number; engine: SharedValue<EngineState> }) {
  const c = size / 2;
  const style = useAnimatedStyle(() => {
    const s = engine.get();
    // Trail spacing grows with speed so it reads as motion blur at high pace.
    const lag = k * (3 + s.speed / 80);
    return { transform: [{ rotate: `${s.angle - s.dir * lag}deg` }] };
  });
  const d = 14 - k * 2.4;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <View
        style={{
          position: 'absolute',
          left: c - d / 2,
          top: c - r - d / 2,
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: colors.primary,
          opacity: 0.42 - k * 0.09,
        }}
      />
    </Animated.View>
  );
}

function BurstParticle({ i, c, r, burst, burstAngle }: { i: number; c: number; r: number; burst: SharedValue<number>; burstAngle: SharedValue<number> }) {
  const dirAngle = (i / BURST_PARTS) * Math.PI * 2;
  const speed = 26 + (i % 3) * 12;
  const style = useAnimatedStyle(() => {
    const t = burst.get();
    if (t <= 0 || t >= 1) return { opacity: 0 };
    const a = ((burstAngle.get() - 90) * Math.PI) / 180;
    const x = c + Math.cos(a) * r + Math.cos(dirAngle) * speed * t;
    const y = c + Math.sin(a) * r + Math.sin(dirAngle) * speed * t;
    return { opacity: 1 - t, transform: [{ translateX: x - 2.5 }, { translateY: y - 2.5 }, { scale: 1 - t * 0.5 }] };
  });
  return <Animated.View style={[styles.particle, i % 2 ? styles.particleAlt : null, style]} />;
}

export const Ring = memo(RingImpl);

const styles = StyleSheet.create({
  spark: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E9FDFF',
    borderWidth: 3,
    borderColor: colors.primary,
    boxShadow: '0 0 16px 4px rgba(60,240,255,0.75)',
  },
  particle: { position: 'absolute', left: 0, top: 0, width: 5, height: 5, borderRadius: 1, backgroundColor: colors.primary },
  particleAlt: { backgroundColor: colors.accent },
});
