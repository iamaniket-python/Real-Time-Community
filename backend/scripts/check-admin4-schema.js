import { query, pool } from '../src/config/db.js';

const t = await query(
  `SELECT data_type, udt_name FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'type'`);
console.log('notifications.type:', t.rows[0]);
if (t.rows[0]?.data_type === 'USER-DEFINED') {
  const e = await query(
    `SELECT e.enumlabel FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid
      WHERE ty.typname = $1 ORDER BY e.enumsortorder`, [t.rows[0].udt_name]);
  const labels = e.rows.map((r) => r.enumlabel);
  console.log('values:', labels.join(', '));
  console.log(labels.includes('REQUEST_CANCELLED') ? 'REQUEST_CANCELLED exists' : 'REQUEST_CANCELLED is MISSING');
}

const h = await query(
  `SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'request_status_history' ORDER BY ordinal_position`);
console.table(h.rows);
await pool.end();