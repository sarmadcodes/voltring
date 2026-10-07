// Synthesises every VOLTRING sound from scratch (no samples), so all audio is original.
// Run: node scripts/generate-audio.mjs  -> writes assets/audio/*.wav (22.05 kHz mono 16-bit)
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const OUT = new URL('../assets/audio/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const osc = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  square: (p) => ((p % 1) < 0.5 ? 1 : -1),
  tri: (p) => 1 - 4 * Math.abs((p % 1) - 0.5),
  saw: (p) => 2 * (p % 1) - 1,
};

/** One voice: frequency glide f0 -> f1 with attack/decay envelope. */
function tone(buf, start, dur, { f0, f1 = f0, wave = 'square', vol = 0.3, attack = 0.004, curve = 2, vibrato = 0 }) {
  const n0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  let phase = 0;
  for (let i = 0; i < n && n0 + i < buf.length; i++) {
    const t = i / RATE;
    const k = i / n;
    const f = f0 * Math.pow(f1 / f0, k) * (1 + vibrato * Math.sin(2 * Math.PI * 7 * t));
    phase += f / RATE;
    const env = Math.min(1, t / attack) * Math.pow(1 - k, curve);
    buf[n0 + i] += osc[wave](phase) * vol * env;
  }
}

function noise(buf, start, dur, vol, curve = 3) {
  const n0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  let last = 0;
  for (let i = 0; i < n && n0 + i < buf.length; i++) {
    last = last * 0.6 + (Math.random() * 2 - 1) * 0.4; // gently low-passed
    buf[n0 + i] += last * vol * Math.pow(1 - i / n, curve);
  }
}

/** Simple one-pole low-pass to soften square-wave harshness. */
function lowpass(buf, amount) {
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += amount * (buf[i] - y);
    buf[i] = y;
  }
}

function write(name, buf, gain = 1) {
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? (0.89 / peak) * gain : 0;
  const data = Buffer.alloc(44 + buf.length * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + buf.length * 2, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(buf.length * 2, 40);
  buf.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * scale)) * 32767), 44 + i * 2));
  writeFileSync(new URL(name, OUT), data);
}

const make = (sec) => new Float32Array(Math.ceil(sec * RATE));

// UI click: tiny, dry blip.
{
  const b = make(0.06);
  tone(b, 0, 0.05, { f0: 1400, f1: 900, wave: 'square', vol: 0.4, curve: 3 });
  lowpass(b, 0.5);
  write('click.wav', b, 0.55);
}
// Hit: bright upward chirp.
{
  const b = make(0.12);
  tone(b, 0, 0.1, { f0: 660, f1: 1320, wave: 'square', vol: 0.35 });
  tone(b, 0, 0.1, { f0: 1320, f1: 1980, wave: 'tri', vol: 0.25 });
  lowpass(b, 0.45);
  write('hit.wav', b, 0.7);
}
// Perfect: two-note sparkle.
{
  const b = make(0.2);
  tone(b, 0, 0.08, { f0: 1046, wave: 'square', vol: 0.3 });
  tone(b, 0.06, 0.14, { f0: 1568, wave: 'square', vol: 0.3 });
  tone(b, 0.06, 0.14, { f0: 3136, wave: 'sine', vol: 0.15 });
  lowpass(b, 0.5);
  write('perfect.wav', b, 0.75);
}
// Combo milestone: quick major arpeggio.
{
  const b = make(0.32);
  [523, 659, 784, 1046].forEach((f, i) => tone(b, i * 0.06, 0.12, { f0: f, wave: 'square', vol: 0.28 }));
  lowpass(b, 0.45);
  write('combo.wav', b, 0.75);
}
// Miss: short descending buzz with grit.
{
  const b = make(0.26);
  tone(b, 0, 0.24, { f0: 220, f1: 90, wave: 'saw', vol: 0.4, curve: 1.5 });
  noise(b, 0, 0.12, 0.25);
  lowpass(b, 0.3);
  write('miss.wav', b, 0.8);
}
// Game over: falling three-note phrase.
{
  const b = make(0.85);
  [392, 311, 233].forEach((f, i) => tone(b, i * 0.18, 0.3, { f0: f, f1: f * 0.97, wave: 'square', vol: 0.3, curve: 1.6 }));
  tone(b, 0.54, 0.3, { f0: 116, f1: 80, wave: 'tri', vol: 0.4 });
  lowpass(b, 0.3);
  write('gameover.wav', b, 0.85);
}
// New record: rising fanfare.
{
  const b = make(0.9);
  [523, 659, 784, 1046, 1318].forEach((f, i) =>
    tone(b, i * 0.09, i === 4 ? 0.45 : 0.14, { f0: f, wave: 'square', vol: 0.26, vibrato: i === 4 ? 0.006 : 0 }),
  );
  tone(b, 0.36, 0.5, { f0: 2093, wave: 'sine', vol: 0.12 });
  lowpass(b, 0.45);
  write('record.wav', b, 0.8);
}
// Countdown tick + GO.
{
  const b = make(0.09);
  tone(b, 0, 0.08, { f0: 880, wave: 'tri', vol: 0.4 });
  write('tick.wav', b, 0.6);
  const g = make(0.3);
  tone(g, 0, 0.26, { f0: 880, f1: 1760, wave: 'square', vol: 0.3, curve: 1.2 });
  lowpass(g, 0.45);
  write('go.wav', g, 0.7);
}

// Music: 16-bar minor arpeggio loop at 112 BPM, sample-exact length so it loops cleanly.
{
  const bpm = 112;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const bars = 8;
  const total = bars * 4 * beat;
  const b = make(total);
  // Am - F - C - G progression, two bars each.
  const chords = [
    [220, 261.6, 329.6],
    [174.6, 220, 261.6],
    [261.6, 329.6, 392],
    [196, 246.9, 293.7],
  ];
  for (let bar = 0; bar < bars; bar++) {
    const chord = chords[Math.floor(bar / 2) % chords.length];
    const barStart = bar * 4 * beat;
    // Bass: root on every beat, octave down.
    for (let q = 0; q < 4; q++) {
      tone(b, barStart + q * beat, beat * 0.9, { f0: chord[0] / 2, wave: 'tri', vol: 0.32, curve: 1.3 });
    }
    // Arp: up-down pattern on sixteenths, two octaves up.
    const pattern = [0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1];
    pattern.forEach((idx, s) => {
      tone(b, barStart + s * sixteenth, sixteenth * 0.9, { f0: chord[idx] * 2, wave: 'square', vol: 0.1, curve: 2.5 });
    });
    // Soft hat on offbeats.
    for (let q = 0; q < 4; q++) noise(b, barStart + q * beat + beat / 2, 0.03, 0.05, 4);
  }
  lowpass(b, 0.22);
  write('music.wav', b, 0.6);
}

console.log('audio written to assets/audio (encode music: ffmpeg -i assets/audio/music.wav -c:a aac -b:a 64k assets/audio/music.m4a)');
