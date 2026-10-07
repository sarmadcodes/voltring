export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
const PATTERN = /^[A-Za-z0-9_]+$/;

/** Names that would let someone impersonate the game or confuse the leaderboard UI. Mirrored server-side. */
const RESERVED = new Set(['admin', 'administrator', 'moderator', 'mod', 'voltring', 'support', 'staff', 'system', 'you', 'null', 'undefined', 'anonymous']);

export type UsernameError = 'empty' | 'short' | 'long' | 'chars' | 'reserved';

export function normalizeUsername(input: string): string {
  return input.trim().replace(/\s+/g, '_');
}

export function validateUsername(input: string): { ok: true; value: string } | { ok: false; error: UsernameError } {
  const value = normalizeUsername(input);
  if (value.length === 0) return { ok: false, error: 'empty' };
  if (value.length < USERNAME_MIN) return { ok: false, error: 'short' };
  if (value.length > USERNAME_MAX) return { ok: false, error: 'long' };
  if (!PATTERN.test(value)) return { ok: false, error: 'chars' };
  if (RESERVED.has(value.toLowerCase())) return { ok: false, error: 'reserved' };
  return { ok: true, value };
}

export const usernameErrorText: Record<UsernameError | 'taken' | 'cooldown' | 'offline', string> = {
  empty: 'Enter a player name.',
  short: `At least ${USERNAME_MIN} characters.`,
  long: `At most ${USERNAME_MAX} characters.`,
  chars: 'Letters, numbers and underscores only.',
  reserved: 'That name is reserved. Try another.',
  taken: 'That name is already taken. Try another.',
  cooldown: 'You can change your name once every 24 hours.',
  offline: "You're offline. Try again when you're connected.",
};
