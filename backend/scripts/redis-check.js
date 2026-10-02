import { redis, pingRedis, closeRedis } from '../src/config/redis.js';

// Give the connection a moment to open
await new Promise((r) => setTimeout(r, 1000));

console.log('ping:', (await pingRedis()) ? 'PONG' : 'FAILED');
if (redis.status === 'ready') {
  await redis.set('check:key', 'ok', 'EX', 10);
  console.log('set/get:', await redis.get('check:key'));
  await redis.del('check:key');
}
await closeRedis();