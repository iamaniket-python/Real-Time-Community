import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  // Neon idle connections kaat deta hai, isliye hum pehle hi band kar dete hain
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

// Idle connection par error aaye to server crash nahi hoga.
// pg us client ko pool se khud hata deta hai, agli query naya connection legi.
pool.on('error', (err) => {
  console.error('[pg] idle client error (ignored):', err.code || err.message);
});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // connection pehle hi mar chuka hai, usse pool mein wapas mat bhejo
      broken = true;
    }
    throw err;
  } finally {
    client.release(broken);
  }
}