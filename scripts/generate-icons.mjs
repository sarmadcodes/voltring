// Renders the VOLTRING mark (ring + gate + spark) to PNG with no dependencies.
// Run: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../assets/images/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const BG = hex('#06060B');
const CYAN = hex('#3CF0FF');
const MAGENTA = hex('#FF3DB8');
const PURPLE = hex('#B26BFF');
const WHITE = [0.93, 0.99, 1];

const smooth = (edge, d, aa) => Math.min(1, Math.max(0, 0.5 - (d - edge) / aa));

/**
 * Shape coverage at point (x, y) in mark space (unit = ring radius, origin = centre).
 * Returns layered contributions so callers can composite with or without a background.
 */
function sample(x, y, px) {
  const len = Math.hypot(x, y);
  const ang = Math.atan2(x, -y); // 0 = top, clockwise
  const dRing = Math.abs(len - 1);
  const ring = smooth(0.055, dRing, px);
  const ringGlow = Math.exp(-((dRing / 0.22) ** 2)) * 0.55;

  // Gate arc centred at 135deg (lower right), +/-32deg.
  const gateCenter = (135 * Math.PI) / 180;
  let da = ang - gateCenter;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const halfArc = (32 * Math.PI) / 180;
  const angOut = Math.max(0, Math.abs(da) - halfArc) * len;
  const dGate = Math.hypot(angOut, Math.max(0, dRing - 0.0));
  const gate = smooth(0.13, dGate, px);
  const gateGlow = Math.exp(-((dGate / 0.3) ** 2)) * 0.6;

  // Spark at -45deg (upper left).
  const sa = (-45 * Math.PI) / 180;
  const sx = Math.sin(sa);
  const sy = -Math.cos(sa);
  const dSpark = Math.hypot(x - sx, y - sy);
  const spark = smooth(0.2, dSpark, px);
  const sparkRim = smooth(0.2, dSpark, px) - smooth(0.13, dSpark, px);
  const sparkGlow = Math.exp(-((dSpark / 0.42) ** 2)) * 0.9;

  return { ring, ringGlow, gate, gateGlow, spark, sparkRim, sparkGlow, len };
}

function render(size, { scale, background, mono = false, ss = 3 }) {
  const out = Buffer.alloc(size * size * 4);
  const px = (1 / (scale * size)) * 1.2;
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = ((pxl + (sx + 0.5) / ss) / size - 0.5) / scale;
          const y = ((py + (sy + 0.5) / ss) / size - 0.5) / scale;
          const s = sample(x, y, px);
          let cr, cg, cb, ca;
          if (mono) {
            const cov = Math.min(1, Math.max(s.ring, s.gate, s.spark));
            cr = cg = cb = 1;
            ca = cov;
          } else {
            // Additive light over the base.
            let lr = 0, lg = 0, lb = 0;
            const add = (c, k) => {
              lr += c[0] * k;
              lg += c[1] * k;
              lb += c[2] * k;
            };
            add(CYAN, s.ringGlow * 0.6);
            add(MAGENTA, s.gateGlow * 0.7);
            add(CYAN, s.sparkGlow * 0.7);
            const lightA = Math.min(1, Math.max(lr, lg, lb));
            if (background) {
              // Soft purple vignette behind the mark.
              const vig = Math.exp(-((s.len / 1.9) ** 2)) * 0.16;
              cr = BG[0] + PURPLE[0] * vig + lr;
              cg = BG[1] + PURPLE[1] * vig + lg;
              cb = BG[2] + PURPLE[2] * vig + lb;
              ca = 1;
            } else {
              const k = lightA > 0 ? 1 / lightA : 0;
              cr = lr * k;
              cg = lg * k;
              cb = lb * k;
              ca = lightA * 0.85;
            }
            // Solid shapes on top, in paint order: ring, gate, spark.
            const over = (c, cov) => {
              cr = cr * (1 - cov) + c[0] * cov;
              cg = cg * (1 - cov) + c[1] * cov;
              cb = cb * (1 - cov) + c[2] * cov;
              ca = ca + cov * (1 - ca);
            };
            over(CYAN, s.ring);
            over(MAGENTA, s.gate);
            over(WHITE, s.spark);
            over(CYAN, Math.max(0, s.sparkRim));
          }
          r += Math.min(1, cr) * ca;
          g += Math.min(1, cg) * ca;
          b += Math.min(1, cb) * ca;
          a += ca;
        }
      }
      const n = ss * ss;
      const i = (py * size + pxl) * 4;
      const alpha = a / n;
      out[i] = alpha > 0 ? Math.round(((r / n) / alpha) * 255) : 0;
      out[i + 1] = alpha > 0 ? Math.round(((g / n) / alpha) * 255) : 0;
      out[i + 2] = alpha > 0 ? Math.round(((b / n) / alpha) * 255) : 0;
      out[i + 3] = Math.round(alpha * 255);
    }
  }
  return png(size, size, out);
}

const write = (name, buf) => {
  writeFileSync(new URL(name, OUT), buf);
  console.log('wrote', name, buf.length, 'bytes');
};

// Launcher / Play icon: full-bleed dark tile, mark at ~62% width.
write('icon.png', render(1024, { scale: 0.31, background: true }));
// Adaptive foreground: must sit inside the 66% safe zone of the 108dp canvas.
write('android-icon-foreground.png', render(1024, { scale: 0.215, background: false }));
write('android-icon-monochrome.png', render(1024, { scale: 0.215, background: false, mono: true }));
write('splash-icon.png', render(512, { scale: 0.36, background: false }));
write('favicon.png', render(48, { scale: 0.34, background: true, ss: 4 }));
// Play Store hi-res icon (512x512, 32-bit PNG).
write('play-store-icon.png', render(512, { scale: 0.31, background: true }));
