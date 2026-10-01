import { query, pool } from '../src/config/db.js';

const need = ['reporter_id', 'reported_user_id', 'request_id', 'reason', 'details', 'status', 'created_at'];

const { rows } = await query(
  `SELECT column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports'
    ORDER BY ordinal_position`);
console.table(rows);

const have = new Set(rows.map((r) => r.column_name));
const missing = need.filter((c) => !have.has(c));
console.log(missing.length ? `MISSING: ${missing.join(', ')}` : 'Columns match.');

for (const col of ['reason', 'status']) {
  const r = rows.find((x) => x.column_name === col);
  if (r?.data_type === 'USER-DEFINED') {
    const e = await query(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = $1 ORDER BY e.enumsortorder`, [r.udt_name]);
    console.log(`${col} enum values:`, e.rows.map((x) => x.enumlabel).join(', '));
  }
}

const cons = await query(
  `SELECT conname, pg_get_constraintdef(oid) AS def
     FROM pg_constraint WHERE conrelid = 'public.reports'::regclass`);
console.table(cons.rows);

await pool.end();