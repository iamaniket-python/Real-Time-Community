import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CLIENT_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  UPLOAD_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().min(12).optional(),
  MAP_API_KEY: z.string().optional(),
  REQUEST_SEARCH_RADIUS_KM: z.coerce.number().default(5),
  REQUEST_TIMEOUT_SECONDS: z.coerce.number().default(120),
  MATCH_MAX_RADIUS_KM: z.coerce.number().default(25),
  REQUEST_RADIUS_STEP_KM: z.coerce.number().default(5),
  REQUEST_EXPANSION_INTERVAL_SECONDS: z.coerce.number().default(40),
  HELPER_LOCATION_MAX_AGE_MINUTES: z.coerce.number().default(30),
  NEARBY_HELPERS_LIMIT: z.coerce.number().default(20),
  HELPER_OFFLINE_GRACE_SECONDS: z.coerce.number().default(60),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
