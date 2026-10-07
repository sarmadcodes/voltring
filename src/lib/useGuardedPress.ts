import { useCallback, useRef } from 'react';

/**
 * Swallows repeat presses inside a short window so spamming PLAY / LEADERBOARD / BACK
 * can't push duplicate screens or fire an action twice.
 */
export function useGuardedPress<A extends unknown[]>(fn: (...args: A) => void, windowMs = 450) {
  const last = useRef(0);
  return useCallback(
    (...args: A) => {
      const now = Date.now();
      if (now - last.current < windowMs) return;
      last.current = now;
      fn(...args);
    },
    [fn, windowMs],
  );
}
