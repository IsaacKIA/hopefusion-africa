import { redis } from '../config/db.js';

// Local in-memory fallback store if Redis connection is unavailable or drops
const memoryStore = new Map();

/**
 * Custom robust rate limiter middleware using Redis with memory store fallback.
 * @param {number} maxReqs - Maximum number of requests allowed in the time window.
 * @param {number} windowSec - Time window in seconds.
 */
export const rateLimit = (maxReqs, windowSec) => async (req, res, next) => {
  const key = `ratelimit:${req.ip}:${req.path}`;

  try {
    if (redis.isOpen) {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec);
      }
      if (current > maxReqs) {
        return res.status(429).json({ error: 'Too many requests. Slow down.' });
      }
      return next();
    }
  } catch (err) {
    console.error(`[RateLimiter] Redis error, falling back to local memory rate limiting:`, err.message);
  }

  // Memory store fallback
  const now = Math.floor(Date.now() / 1000);
  let record = memoryStore.get(key);

  if (!record || record.resetTime <= now) {
    record = {
      count: 0,
      resetTime: now + windowSec,
    };
  }

  record.count += 1;
  memoryStore.set(key, record);

  if (record.count > maxReqs) {
    return res.status(429).json({ error: 'Too many requests. Slow down.' });
  }

  next();
};
