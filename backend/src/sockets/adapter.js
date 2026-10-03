import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ioredis often throws an AggregateError with an empty message; dig out something useful.
function describeError(err) {
  const inner = Array.isArray(err?.errors)
    ? err.errors.map((e) => e.code || e.message).filter(Boolean).join(',')
    : '';
  return err?.message || err?.code || inner || String(err) || 'unknown';
}

/** Separate pub/sub connections (subscribers can't run normal commands). Returns a close function. */
export function attachRedisAdapter(io) {
  const pub = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const sub = pub.duplicate();
  let lastLog = 0;
  const onError = (err) => {
    if (Date.now() - lastLog > 30_000) {
      lastLog = Date.now();
      logger.warn({ err: describeError(err), code: err?.code }, 'socket adapter redis error');
    }
  };
  pub.on('error', onError);
  sub.on('error', onError);
  pub.on('ready', () => logger.info('socket adapter redis ready'));

  io.adapter(createAdapter(pub, sub));
  logger.info('socket.io redis adapter attached');

  return async () => {
    await Promise.allSettled([pub.quit(), sub.quit()]);
  };
}