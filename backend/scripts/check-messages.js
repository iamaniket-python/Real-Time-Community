import { query, pool } from '../src/config/db.js';

const cols = await query(
  `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
    WHERE table_name = 'messages' ORDER BY ordinal_position`);
console.table(cols.rows);

const cons = await query(
  `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE conrelid = 'messages'::regclass`);
console.table(cons.rows);

await pool.end();