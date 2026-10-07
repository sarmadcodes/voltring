export function formatScore(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('en-US');
}

/** Fixed-width arcade counter, e.g. 1240 -> "001240". */
export function padScore(n: number, digits = 6): string {
  const s = String(Math.max(0, Math.floor(n)));
  return s.length >= digits ? s : '0'.repeat(digits - s.length) + s;
}
