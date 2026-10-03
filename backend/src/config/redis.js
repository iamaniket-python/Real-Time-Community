import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Safe summary of the connection target (no password, no full host) for debugging.
function describeTarget(url) {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol.replace(':', ''),
      isLocalhost: ['localhost', '127.0.0.1', '::1'].includes(u.hostname),
      port: u.port || '(default)',
    };
  } catch {
    return { invalidUrl: true };
  }
}

// ioredis often throws an AggregateError with an empty message; dig out something useful.
export function describeError(err) {
  const inner = Array.isArray(err?.errors)
    ? err.errors.map((e) => e.code || e.message).filter(Boolean).join(',')
    : '';
  return err?.message || err?.code || inner || String(err) || 'unknown';
}

logger.info({ redisTarget: describeTarget(env.REDIS_URL) }, 'redis config');

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
    logger.warn({ err: describeError(err), code: err?.code }, 'redis error');
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