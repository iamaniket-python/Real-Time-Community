import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Lazy: nothing connects until the first command, so scripts and tests can import this safely.
// Redis outages must not crash the API: commands fail fast and callers fall back.
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 5_000,
  retryStrategy: (times) => Math.min(times * 500, 5_000), // keep retrying in the background
});

let lastErrorLog = 0;
redis.on('error', (err) => {
  // ioredis emits this on every failed retry; log at most once per 30 s
  if (Date.now() - lastErrorLog > 30_000) {
    lastErrorLog = Date.now();
    logger.warn({ err: err.message }, 'redis error');
  }
});
redis.on('ready', () => logger.info('redis ready'));

export const redisReady = () => redis.status === 'ready';

export async function pingRedis() {
  try {
    return (await redis.ping()) === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis() {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}