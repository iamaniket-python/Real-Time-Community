import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');
console.log('reading migrations from:', dir);

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
)`);

const done = new Set(
  (await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name),
);

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(file)) continue;

  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  console.log(`${file}: ${sql.length} characters`);
  if (sql.trim().length < 100) {
    console.error(`${file} is empty or too short, refusing to apply it`);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log('applied', file);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('failed', file, '-', e.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

const { rows } = await pool.query("SELECT to_regclass('public.categories') AS categories");
console.log('categories table:', rows[0].categories ?? 'MISSING');
await pool.end();