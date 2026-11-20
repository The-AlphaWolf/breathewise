const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window limiter, in memory per server instance.
 * ponytail: resets on cold start and is per-instance; use a shared store if the app scales out.
 */
export function rateLimited(key: string, limit = 10, windowMs = 60_000, now = Date.now()): boolean {
  const entry = hits.get(key);
  if (entry === undefined || entry.resetAt <= now) {
    if (hits.size > 5_000) hits.clear();
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
