/**
 * Diagnostics stay in development. Production never surfaces raw errors to players;
 * swap the body of logError for a crash reporter later if one is added.
 */
export function logError(scope: string, error: unknown): void {
  if (__DEV__) console.warn(`[voltring:${scope}]`, error);
}
