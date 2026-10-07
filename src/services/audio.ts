import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { logError } from '@/lib/log';
import { getState } from '@/state/store';

const SOURCES = {
  click: require('../../assets/audio/click.wav'),
  hit: require('../../assets/audio/hit.wav'),
  perfect: require('../../assets/audio/perfect.wav'),
  combo: require('../../assets/audio/combo.wav'),
  miss: require('../../assets/audio/miss.wav'),
  gameover: require('../../assets/audio/gameover.wav'),
  record: require('../../assets/audio/record.wav'),
  tick: require('../../assets/audio/tick.wav'),
  go: require('../../assets/audio/go.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

/** Hits can fire faster than a clip finishes; a small pool lets them overlap cleanly. */
const POOL_SIZE: Partial<Record<SoundName, number>> = { hit: 3, perfect: 2, click: 2 };

const pools = new Map<SoundName, { players: AudioPlayer[]; next: number }>();
let music: AudioPlayer | null = null;
let initialised = false;
let musicWanted = false;

export async function initAudio(): Promise<void> {
  if (initialised) return;
  initialised = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
    for (const name of Object.keys(SOURCES) as SoundName[]) {
      const players = Array.from({ length: POOL_SIZE[name] ?? 1 }, () => createAudioPlayer(SOURCES[name]));
      pools.set(name, { players, next: 0 });
    }
    music = createAudioPlayer(require('../../assets/audio/music.m4a'));
    music.loop = true;
    music.volume = 0.32;
    if (musicWanted) syncMusic();
  } catch (e) {
    // Audio is optional; the game stays fully playable silently.
    logError('audio.init', e);
  }
}

export function play(name: SoundName): void {
  if (!getState().settings.sound) return;
  const pool = pools.get(name);
  if (!pool) return;
  try {
    const p = pool.players[pool.next];
    pool.next = (pool.next + 1) % pool.players.length;
    p.seekTo(0).catch(() => undefined);
    p.play();
  } catch (e) {
    logError('audio.play', e);
  }
}

/** Screens declare whether they want music; the setting and app focus decide if it actually plays. */
export function setMusicWanted(wanted: boolean): void {
  musicWanted = wanted;
  syncMusic();
}

let appActive = true;
export function setAppActive(active: boolean): void {
  appActive = active;
  syncMusic();
}

export function syncMusic(): void {
  if (!music) return;
  try {
    const shouldPlay = musicWanted && appActive && getState().settings.music;
    if (shouldPlay && !music.playing) music.play();
    else if (!shouldPlay && music.playing) music.pause();
  } catch (e) {
    logError('audio.music', e);
  }
}
