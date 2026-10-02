import 'dotenv/config';
import Redis from 'ioredis';

const r = new Redis(process.env.REDIS_URL);
const keys = await r.keys('rl:*');
if (keys.length) await r.del(...keys);
console.log('cleared', keys.length, 'rate-limit keys');
await r.quit();