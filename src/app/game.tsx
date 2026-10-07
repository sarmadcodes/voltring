import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Backdrop } from '@/components/Backdrop';
import { NeonText } from '@/components/NeonText';
import { Countdown, GameOverPanel, PausePanel } from '@/components/game/Overlays';
import { ComboDisplay, LivesDisplay, PauseButton, ScoreDisplay } from '@/components/game/Hud';
import { Ring } from '@/components/game/Ring';
import { LEADERBOARD_ENABLED } from '@/config/env';
import { Evt, Status, createEngineState, revive, step, tap, type EngineState } from '@/game/engine';
import { COMBO_MILESTONE, START_LIVES, gateHalfForHits, levelForHits } from '@/game/rules';
import { formatScore } from '@/lib/format';
import { useGuardedPress } from '@/lib/useGuardedPress';
import { isRewardedReady, maybeShowInterstitial, noteGameCompleted, onRewardedReadyChange, showRewarded } from '@/services/ads';
import { play } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { newRunId, recordRun, syncNow } from '@/services/sync';
import { useAppData } from '@/state/store';
import { colors, space } from '@/theme/tokens';

type Phase = 'countdown' | 'playing' | 'paused' | 'over';

interface Hud {
  score: number;
  combo: number;
  lives: number;
  half: number;
  golden: boolean;
}

interface Feedback {
  text: string;
  color: string;
  id: number;
}

interface OverInfo {
  score: number;
  maxCombo: number;
  newBest: boolean;
}

const INITIAL_HUD: Hud = { score: 0, combo: 0, lives: START_LIVES, half: gateHalfForHits(0), golden: false };
const COUNT_STEP_MS = 420;

const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;

export default function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const best = useAppData((s) => s.stats.best);
  const gamesPlayed = useAppData((s) => s.stats.gamesPlayed);
  const rank = useAppData((s) => s.rank);
  const sync = useAppData((s) => s.sync);
  const hasPending = useAppData((s) => s.stats.pending !== null);

  const [initialState] = useState(() => createEngineState(newSeed()));
  const engine = useSharedValue<EngineState>(initialState);
  const pulse = useSharedValue(0);
  const burst = useSharedValue(0);
  const burstAngle = useSharedValue(0);
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);

  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState<string | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [over, setOver] = useState<OverInfo | null>(null);
  const [rewardReady, setRewardReady] = useState(isRewardedReady());
  const [continueUsed, setContinueUsed] = useState(false);

  const run = useRef({ runId: newRunId(), continued: false, overHandled: false });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false);
  const feedbackId = useRef(0);
  const [bestAtStart, setBestAtStart] = useState(best);
  const phaseRef = useRef<Phase>('countdown');

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => onRewardedReadyChange(setRewardReady), []);
  useEffect(() => clearTimers, [clearTimers]);

  // ---------------------------------------------------------------------------
  // UI-thread loop. Only discrete events cross to JS; per-frame motion never touches React.
  // ---------------------------------------------------------------------------

  // Stable trampoline so worklets never capture a stale (or re-created) JS closure.
  type EventArgs = [number, number, number, number, number, boolean, number, number, number, number];
  const handlerRef = useRef<(...args: EventArgs) => void>(() => undefined);
  const dispatch = useCallback((...args: EventArgs) => handlerRef.current(...args), []);

  const fx = useCallback((evt: number) => {
    'worklet';
    const s = engine.get();
    if (evt === Evt.Hit || evt === Evt.Perfect) {
      burstAngle.set(s.angle);
      burst.set(0);
      burst.set(withTiming(1, { duration: 380 }));
      pulse.set(withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 200 })));
    } else if (evt !== Evt.None) {
      flash.set(withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 260 })));
      if (!reduceMotion) {
        shake.set(
          withSequence(
            withTiming(9, { duration: 40 }),
            withTiming(-7, { duration: 50 }),
            withTiming(4, { duration: 50 }),
            withTiming(0, { duration: 50 }),
          ),
        );
      }
    }
    scheduleOnRN(dispatch, evt, s.score, s.combo, s.lives, s.half, s.golden, s.lastPoints, s.hits, s.maxCombo, s.elapsedMs);
  }, [engine, burst, burstAngle, pulse, flash, shake, reduceMotion, dispatch]);

  const frame = useFrameCallback((info) => {
    'worklet';
    const dt = info.timeSincePreviousFrame ?? 16;
    let evt = 0;
    engine.modify((s) => {
      'worklet';
      evt = step(s, dt);
      return s;
    }, true);
    if (evt !== Evt.None) fx(evt);
  }, false);

  const pauseRef = useRef<() => void>(() => undefined);
  const requestPause = useCallback(() => pauseRef.current(), []);

  // Top-right box (pause button plus generous margin) excluded from playfield input.
  const pauseZone = useMemo(
    () => ({ x: width - (space.lg + 48 + 16), y: insets.top + space.sm + 58 + 48 + 16 }),
    [width, insets.top],
  );

  // Raw touch-down, handled on the UI thread: no gesture recognition delay, every finger counts.
  const input = useMemo(
    () =>
      // Gesture builders are configured during render by design (RNGH docs); nothing here reads a ref.
      // eslint-disable-next-line react-hooks/refs
      Gesture.Manual().onTouchesDown((e) => {
        'worklet';
        // One input path for the whole screen: the pause button's box pauses, everything else is a tap.
        // (Separate recognisers for an overlapping button proved unreliable across platforms.)
        const t = e.changedTouches[0];
        if (t && t.absoluteX >= pauseZone.x && t.absoluteY <= pauseZone.y) {
          if (engine.get().status === Status.Playing) scheduleOnRN(requestPause);
          return;
        }
        let evt = 0;
        engine.modify((s) => {
          'worklet';
          evt = tap(s);
          return s;
        }, true);
        if (evt !== Evt.None) fx(evt);
      }),
    [engine, fx, pauseZone, requestPause],
  );

  // ---------------------------------------------------------------------------
  // Flow
  // ---------------------------------------------------------------------------

  const startCountdown = useCallback(() => {
    clearTimers();
    setPhaseBoth('countdown');
    const steps = ['3', '2', '1'];
    steps.forEach((v, i) =>
      later(() => {
        setCount(v);
        play('tick');
      }, i * COUNT_STEP_MS),
    );
    later(() => {
      setCount('GO');
      play('go');
      engine.modify((s) => {
        'worklet';
        if (s.status === Status.Idle || s.status === Status.Paused) s.status = Status.Playing;
        return s;
      }, true);
      frame.setActive(true);
      setPhaseBoth('playing');
    }, steps.length * COUNT_STEP_MS);
    later(() => setCount(null), steps.length * COUNT_STEP_MS + 380);
  }, [clearTimers, later, engine, frame, setPhaseBoth]);

  // First countdown on mount.
  useEffect(() => {
    const t = setTimeout(startCountdown, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGameOver(score: number, hits: number, maxCombo: number, elapsedMs: number) {
    if (run.current.overHandled) return;
    run.current.overHandled = true;
    frame.setActive(false);
    clearTimers();
    const { newBest } = recordRun(
      { runId: run.current.runId, score, hits, durationMs: Math.round(elapsedMs), maxCombo },
      run.current.continued,
    );
    if (!run.current.continued) noteGameCompleted();
    const beatStart = score > bestAtStart;
    play(beatStart && newBest ? 'record' : 'gameover');
    haptic('gameover');
    setPhaseBoth('over');
    // Brief beat so the final miss flash registers before the panel covers the ring.
    later(() => setOver({ score, maxCombo, newBest: beatStart }), 320);
  }

  const showFeedback = (text: string, color: string) => {
    feedbackId.current += 1;
    setFeedback({ text, color, id: feedbackId.current });
  };

  const onEngineEventImpl = (evt: number, score: number, combo: number, lives: number, half: number, golden: boolean, points: number, hits: number, maxCombo: number, elapsedMs: number) => {
    setHud({ score, combo, lives, half, golden });
    if (evt === Evt.Hit || evt === Evt.Perfect) {
      const perfect = evt === Evt.Perfect;
      if (combo > 0 && combo % COMBO_MILESTONE === 0) {
        play('combo');
        haptic('milestone');
        showFeedback(`STREAK ${combo}  +${formatScore(points)}`, colors.accent);
      } else {
        play(perfect ? 'perfect' : 'hit');
        haptic('hit');
        if (hits % 10 === 0) showFeedback(`SPEED UP  LV ${levelForHits(hits) + 1}`, colors.secondary);
        else showFeedback(perfect ? `PERFECT  +${formatScore(points)}` : `+${formatScore(points)}`, perfect ? colors.text : colors.primary);
      }
      return;
    }
    if (evt === Evt.MissEarly || evt === Evt.MissLate) {
      play('miss');
      haptic('miss');
      showFeedback(evt === Evt.MissEarly ? 'TOO EARLY' : 'TOO LATE', colors.danger);
      return;
    }
    if (evt === Evt.GameOver) handleGameOver(score, hits, maxCombo, elapsedMs);
  };

  useLayoutEffect(() => {
    handlerRef.current = onEngineEventImpl;
  });

  const pause = useCallback(() => {
    const p = phaseRef.current;
    if (p !== 'playing' && p !== 'countdown') return;
    clearTimers();
    setCount(null);
    engine.modify((s) => {
      'worklet';
      if (s.status === Status.Playing) s.status = Status.Paused;
      return s;
    }, true);
    frame.setActive(false);
    setPhaseBoth('paused');
  }, [clearTimers, engine, frame, setPhaseBoth]);

  useLayoutEffect(() => {
    pauseRef.current = pause;
  });

  const resetRun = useCallback(() => {
    engine.set(createEngineState(newSeed()));
    run.current = { runId: newRunId(), continued: false, overHandled: false };
    setBestAtStart(best);
    setHud(INITIAL_HUD);
    setFeedback(null);
    setOver(null);
    setContinueUsed(false);
    startCountdown();
  }, [engine, best, startCountdown]);

  const leave = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    clearTimers();
    frame.setActive(false);
    if (phaseRef.current === 'over') await maybeShowInterstitial();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [clearTimers, frame]);

  const playAgain = useGuardedPress(async () => {
    if (busy.current) return;
    busy.current = true;
    await maybeShowInterstitial();
    busy.current = false;
    resetRun();
  }, 800);

  const continueRun = useGuardedPress(async () => {
    if (continueUsed || busy.current) return;
    setContinueUsed(true);
    busy.current = true;
    const earned = await showRewarded();
    busy.current = false;
    if (!earned) return;
    engine.modify((s) => {
      'worklet';
      revive(s);
      return s;
    }, true);
    run.current.continued = true;
    run.current.overHandled = false;
    const s = engine.get();
    setHud({ score: s.score, combo: 0, lives: s.lives, half: s.half, golden: s.golden });
    setOver(null);
    setFeedback(null);
    startCountdown();
  }, 800);

  const restartFromPause = useCallback(() => resetRun(), [resetRun]);

  // Pause whenever the app loses focus; never let the loop run in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pause();
      else void syncNow();
    });
    return () => sub.remove();
  }, [pause]);

  // Android back: playing -> pause, paused/over -> leave.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const p = phaseRef.current;
        if (p === 'playing' || p === 'countdown') pause();
        else if (p === 'paused') void leave();
        else if (p === 'over' && !busy.current) void leave();
        return true;
      });
      return () => sub.remove();
    }, [pause, leave]),
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() * 0.22 }));

  const usable = height - insets.top - insets.bottom;
  const ringSize = Math.min(width - space.xl * 1.5, usable * 0.52, 460);

  const rankText = rank ? `#${formatScore(rank)}` : '--';
  let syncNote: string | null = null;
  if (over && LEADERBOARD_ENABLED && hasPending) {
    syncNote = sync === 'failed' ? "Couldn't sync your score. We'll try again." : 'Syncing your score...';
  }

  return (
    <View style={styles.root}>
      <Backdrop />
      <GestureDetector gesture={input}>
        <Animated.View style={[styles.field, shakeStyle]} accessible accessibilityLabel="Playfield. Tap anywhere when the spark is inside the gate." accessibilityRole="button">
          <View style={[styles.hud, { paddingTop: insets.top + space.sm }]}>
            <ScoreDisplay score={hud.score} best={bestAtStart} />
            <View style={styles.hudRow}>
              <LivesDisplay lives={hud.lives} />
            </View>
          </View>

          <View style={styles.middle}>
            <View>
              <Ring
                size={ringSize}
                engine={engine}
                gateHalf={hud.half}
                golden={hud.golden}
                pulse={pulse}
                burst={burst}
                burstAngle={burstAngle}
              />
              <ComboDisplay combo={hud.combo} />
            </View>
            <View style={styles.feedback}>
              {feedback ? (
                <Animated.View key={feedback.id} entering={FadeIn.duration(90)} exiting={FadeOut.duration(220)}>
                  <NeonText variant="heading" color={feedback.color} glow={feedback.color + '88'} glowRadius={10} style={styles.feedbackText}>
                    {feedback.text}
                  </NeonText>
                </Animated.View>
              ) : null}
            </View>
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
            {gamesPlayed < 3 && hud.score === 0 ? (
              <NeonText variant="caption" style={styles.hint}>
                Tap anywhere when the spark is inside the gate. Hit the white center for PERFECT.
              </NeonText>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>

      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />

      {/* Sits outside the playfield detector so pausing never counts as a tap. */}
      {phase === 'playing' || phase === 'countdown' ? (
        <View style={[styles.pauseWrap, { top: insets.top + space.sm + 58 }]} pointerEvents="box-none">
          <PauseButton onPress={pause} />
        </View>
      ) : null}

      {count ? <Countdown value={count} /> : null}

      {phase === 'paused' ? <PausePanel onResume={startCountdown} onRestart={restartFromPause} onHome={leave} /> : null}

      {phase === 'over' && over ? (
        <GameOverPanel
          score={over.score}
          best={Math.max(best, over.score)}
          maxCombo={over.maxCombo}
          newBest={over.newBest}
          rankText={rankText}
          syncNote={syncNote}
          canContinue={!continueUsed && rewardReady}
          onContinue={continueRun}
          onPlayAgain={playAgain}
          onLeaderboard={() => router.push('/leaderboard')}
          onHome={leave}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  field: { flex: 1 },
  hud: { paddingHorizontal: space.lg, gap: space.md },
  hudRow: { flexDirection: 'row', alignItems: 'center', height: 48 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  feedback: { height: 44, marginTop: space.lg, justifyContent: 'center' },
  feedbackText: { fontSize: 18, letterSpacing: 3, textAlign: 'center' },
  footer: { paddingHorizontal: space.xl, minHeight: 60, justifyContent: 'flex-end' },
  hint: { textAlign: 'center' },
  flash: { ...StyleSheet.absoluteFill, backgroundColor: colors.danger },
  pauseWrap: { position: 'absolute', right: space.lg },
});
