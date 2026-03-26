import { redis } from '@/lib/redis'

/**
 * Sliding-window rate limiter backed by Redis.
 * Returns { allowed, remaining } based on the number of calls
 * for the given key within windowSeconds.
 * Fails open: if Redis is unavailable, the request is allowed.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const full = `ratelimit:${key}`
    const current = await redis.incr(full)
    if (current === 1) {
      await redis.expire(full, windowSeconds)
    }
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    }
  } catch {
    // Redis unavailable - fail open so login/upload still works
    return { allowed: true, remaining: limit }
  }
}
