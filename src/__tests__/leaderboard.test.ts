import { parseLeaderboard, sortEntries } from '@/services/leaderboard';

describe('leaderboard parsing', () => {
  it('parses a valid payload and keeps rank order', () => {
    const data = parseLeaderboard({
      top: [
        { rank: 2, username: 'B', best_score: 900 },
        { rank: 1, username: 'A', best_score: 1200 },
        { rank: 3, username: 'C', best_score: 900 },
      ],
      me: { rank: 124, username: 'ME', best_score: 300 },
    });
    expect(data.top.map((e) => e.username)).toEqual(['A', 'B', 'C']);
    expect(data.me).toEqual({ rank: 124, username: 'ME', score: 300 });
  });

  it('survives malformed responses', () => {
    expect(parseLeaderboard(null)).toEqual({ top: [], me: null });
    expect(parseLeaderboard({ top: 'nope' })).toEqual({ top: [], me: null });
    expect(parseLeaderboard({ top: [{ rank: 'x' }, null, { rank: 1, username: 'A', best_score: 5 }] }).top).toHaveLength(1);
  });

  it('sorts deterministically on ties', () => {
    const sorted = sortEntries([
      { rank: 1, username: 'b', score: 10 },
      { rank: 1, username: 'a', score: 10 },
    ]);
    expect(sorted.map((e) => e.username)).toEqual(['a', 'b']);
  });
});
