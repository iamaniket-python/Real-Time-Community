import { pool } from '../src/config/db.js';

const { rows } = await pool.query(
  `SELECT e.enumlabel FROM pg_enum e
   JOIN pg_type t ON t.oid = e.enumtypid
   WHERE t.typname = 'user_role' ORDER BY e.enumsortorder`,
);
console.log('user_role values:', rows.map((r) => r.enumlabel).join(', '));

await pool.end();