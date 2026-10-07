import { LEADERBOARD_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/env';

/**
 * All backend access goes through Postgres RPCs exposed by Supabase PostgREST.
 * The table itself is closed by RLS; these functions validate every write.
 */
export type ApiErrorCode =
  | 'not_configured'
  | 'offline'
  | 'timeout'
  | 'username_taken'
  | 'invalid_username'
  | 'rename_cooldown'
  | 'rate_limited'
  | 'rejected'
  | 'unauthorized'
  | 'server';

export class ApiError extends Error {
  constructor(public code: ApiErrorCode) {
    super(code);
  }
}

const TIMEOUT_MS = 9000;

/** Server raises exceptions with these exact messages (see supabase/migrations). */
const SERVER_CODES: Record<string, ApiErrorCode> = {
  USERNAME_TAKEN: 'username_taken',
  INVALID_USERNAME: 'invalid_username',
  RENAME_COOLDOWN: 'rename_cooldown',
  RATE_LIMITED: 'rate_limited',
  SCORE_REJECTED: 'rejected',
  UNAUTHORIZED: 'unauthorized',
};

export function mapServerMessage(message: unknown): ApiErrorCode {
  if (typeof message !== 'string') return 'server';
  for (const key of Object.keys(SERVER_CODES)) {
    if (message.includes(key)) return SERVER_CODES[key];
  }
  return 'server';
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!LEADERBOARD_ENABLED) throw new ApiError('not_configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(controller.signal.aborted ? 'timeout' : 'offline');
  } finally {
    clearTimeout(timer);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = body && typeof body === 'object' ? (body as { message?: unknown }).message : undefined;
    throw new ApiError(mapServerMessage(msg));
  }
  return body as T;
}

export function isApiError(e: unknown, code?: ApiErrorCode): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}
