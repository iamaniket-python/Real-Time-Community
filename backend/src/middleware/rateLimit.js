import rateLimit from 'express-rate-limit';
import { redis, redisReady } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// INCR + set expiry on first hit, atomically. Returns { hits, ttl in ms }.
const INCR_SCRIPT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return { n, ttl }
`;

let lastWarn = 0;
const warnOnce = (err) => {
  if (Date.now() - lastWarn > 30_000) {
    lastWarn = Date.now();
    logger.warn({ err: err.message }, 'rate limit store: Redis failed, using memory');
  }
};

/** Counts in Redis when it is ready, in memory otherwise. */
class HybridStore {
  constructor(prefix) {
    this.prefix = `rl:${prefix}:`;
    this.windowMs = 60_000;
    this.localKeys = false; // counters live in Redis, shared between instances
    this.memory = new Map(); // key -> { totalHits, resetTime }
    setInterval(() => {
      const now = Date.now();
      for (const [k, e] of this.memory) if (e.resetTime <= now) this.memory.delete(k);
    }, 60_000).unref();
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  memoryIncrement(key) {
    const now = Date.now();
    let e = this.memory.get(key);
    if (!e || e.resetTime <= now) {
      e = { totalHits: 0, resetTime: now + this.windowMs };
      this.memory.set(key, e);
    }
    e.totalHits += 1;
    return { totalHits: e.totalHits, resetTime: new Date(e.resetTime) };
  }

  async increment(key) {
    if (redisReady()) {
      try {
        const [hits, ttl] = await redis.eval(INCR_SCRIPT, 1, this.prefix + key, this.windowMs);
        return {
          totalHits: Number(hits),
          resetTime: new Date(Date.now() + (Number(ttl) > 0 ? Number(ttl) : this.windowMs)),
        };
      } catch (err) {
        warnOnce(err);
      }
    }
    return this.memoryIncrement(key);
  }

  async decrement(key) {
    if (redisReady()) {
      try {
        await redis.decr(this.prefix + key);
      } catch (err) {
        warnOnce(err);
      }
    }
    const e = this.memory.get(key);
    if (e && e.totalHits > 0) e.totalHits -= 1;
  }

  async resetKey(key) {
    this.memory.delete(key);
    if (redisReady()) {
      try {
        await redis.del(this.prefix + key);
      } catch (err) {
        warnOnce(err);
      }
    }
  }
}

/**
 * prefix must be unique per limiter (it namespaces the Redis keys).
 * Without keyGenerator the client IP is used.
 */
export function makeLimiter({ prefix, windowMs, limit, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: new HybridStore(prefix),
    message,
    ...(keyGenerator ? { keyGenerator } : {}),
  });
}