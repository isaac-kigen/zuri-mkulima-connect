// ============================================================
// Simple in-memory rate limiter (Redis in production)
// ============================================================

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitBucket>();

// Periodically clean up expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}, 60_000);

/**
 * Check if a request is rate-limited.
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    // Create new window
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  bucket.count++;
  if (bucket.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  return { allowed: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Rate limit presets matching the capability matrix.
 */
export const RateLimits = {
  LOGIN: { max: 10, window: 15 * 60 * 1000 },        // 10 per 15 min
  REGISTRATION: { max: 8, window: 60 * 60 * 1000 },   // 8 per hour
  PAYMENT: { max: 20, window: 15 * 60 * 1000 },       // 20 per 15 min
};
