import { ApiError, mapServerMessage } from '@/services/api';
import { registerPlayer, submitScore } from '@/services/player';
import { changeUsername, recordRun, resetBackoffForTests, syncNow } from '@/services/sync';
import { getState, setProfile, setState, setStats } from '@/state/store';
import { DEFAULT_STATS } from '@/services/storage';

jest.mock('@/config/env', () => ({ ...jest.requireActual('@/config/env'), LEADERBOARD_ENABLED: true }));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'uuid-' + Math.random().toString(16).slice(2),
  getRandomBytes: (n: number) => new Uint8Array(n).fill(7),
}));
jest.mock('@/services/player', () => ({
  registerPlayer: jest.fn(),
  submitScore: jest.fn(),
  renamePlayer: jest.fn(),
  deletePlayer: jest.fn(),
}));

const register = registerPlayer as jest.Mock;
const submit = submitScore as jest.Mock;
const SECRET = 'a'.repeat(64);

function reset(playerId: string | null = 'p1') {
  resetBackoffForTests();
  register.mockReset();
  submit.mockReset();
  setProfile({ username: 'NEO', secret: SECRET, playerId, nameConflict: false, lastRenameAt: null });
  setStats({ ...DEFAULT_STATS });
  setState({ rank: null, sync: 'idle' });
}

const run = (score: number, runId = `run-${score}`) => ({ runId, score, hits: 20, durationMs: 30_000, maxCombo: 9 });

describe('server error mapping', () => {
  it('maps raised exception names to friendly codes', () => {
    expect(mapServerMessage('USERNAME_TAKEN')).toBe('username_taken');
    expect(mapServerMessage('ERROR: RATE_LIMITED')).toBe('rate_limited');
    expect(mapServerMessage(undefined)).toBe('server');
    expect(mapServerMessage('relation does not exist')).toBe('server');
  });
});

describe('score sync', () => {
  beforeEach(() => reset());

  it('submits a new best exactly once even if sync is triggered repeatedly', async () => {
    let resolve!: (v: unknown) => void;
    submit.mockReturnValue(new Promise((r) => (resolve = r)));
    recordRun(run(500), false); // kicks off a sync
    const a = syncNow(true);
    const b = syncNow(true);
    resolve({ best: 500, rank: 12 });
    await Promise.all([a, b]);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(getState().stats.pending).toBeNull();
    expect(getState().stats.syncedBest).toBe(500);
    expect(getState().rank).toBe(12);
  });

  it('keeps the score queued when offline and backs off', async () => {
    submit.mockRejectedValue(new ApiError('offline'));
    recordRun(run(700), false);
    await syncNow();
    expect(getState().stats.pending?.score).toBe(700);
    expect(getState().sync).toBe('failed');
    submit.mockClear();
    await syncNow(); // within backoff window: no request
    expect(submit).not.toHaveBeenCalled();
    submit.mockResolvedValue({ best: 700, rank: 3 });
    await syncNow(true);
    expect(getState().stats.pending).toBeNull();
  });

  it('drops a run the server rejects instead of retrying forever', async () => {
    submit.mockRejectedValue(new ApiError('rejected'));
    recordRun(run(999999), false);
    await syncNow(true);
    expect(getState().stats.pending).toBeNull();
    expect(getState().stats.best).toBe(999999); // local best stays local
  });

  it('registers first, then submits, when the player has no server id yet', async () => {
    reset(null);
    register.mockResolvedValue('new-id');
    submit.mockResolvedValue({ best: 300, rank: 40 });
    recordRun(run(300), false);
    await syncNow(true);
    expect(register).toHaveBeenCalledWith('NEO', SECRET);
    expect(getState().profile?.playerId).toBe('new-id');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('flags a name conflict instead of submitting under a taken name', async () => {
    reset(null);
    register.mockRejectedValue(new ApiError('username_taken'));
    recordRun(run(300), false);
    await syncNow(true);
    expect(getState().profile?.nameConflict).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    expect(getState().stats.pending?.score).toBe(300);
  });

  it('lets an unregistered player rename locally to resolve the conflict', async () => {
    reset(null);
    setProfile({ ...getState().profile!, nameConflict: true });
    register.mockResolvedValue('id-2');
    const res = await changeUsername('NEO_2');
    expect(res).toEqual({ ok: true });
    expect(getState().profile?.username).toBe('NEO_2');
    expect(getState().profile?.nameConflict).toBe(false);
  });
});
