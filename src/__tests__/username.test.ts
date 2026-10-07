import { USERNAME_MAX, normalizeUsername, validateUsername } from '@/lib/username';

describe('username validation', () => {
  it('trims and converts inner spaces', () => {
    expect(normalizeUsername('  neo  ')).toBe('neo');
    expect(normalizeUsername('big  boss')).toBe('big_boss');
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['ab', 'short'],
    ['x'.repeat(USERNAME_MAX + 1), 'long'],
    ['bad-name', 'chars'],
    ['emoji\u{1F600}', 'chars'],
    ['<script>', 'chars'],
    ['ADMIN', 'reserved'],
    ['Voltring', 'reserved'],
  ])('rejects %p as %s', (input, error) => {
    expect(validateUsername(input)).toEqual({ ok: false, error });
  });

  it('accepts sensible names', () => {
    expect(validateUsername('SARMS')).toEqual({ ok: true, value: 'SARMS' });
    expect(validateUsername(' player_1 ')).toEqual({ ok: true, value: 'player_1' });
    expect(validateUsername('x'.repeat(USERNAME_MAX)).ok).toBe(true);
  });
});
