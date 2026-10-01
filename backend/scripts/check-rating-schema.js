import { query, pool } from '../src/config/db.js';

const need = {
  ratings: ['request_id', 'rater_id', 'helper_id', 'score', 'comment', 'created_at'],
  helper_profiles: ['rating_avg', 'rating_count'],
  notifications: ['user_id', 'type', 'title', 'data'],
};

let bad = false;
for (const [table, cols] of Object.entries(need)) {
  const { rows } = await query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`, [table]);
  const have = new Set(rows.map((r) => r.column_name));
  const missing = cols.filter((c) => !have.has(c));
  console.log(table, missing.length ? `MISSING: ${missing.join(', ')}` : 'ok');
  if (missing.length) { bad = true; console.log('  actual columns:', [...have].join(', ')); }
}

const t = await query(
  `SELECT data_type, udt_name FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'type'`);
console.log('notifications.type is', t.rows[0]);
if (t.rows[0]?.data_type === 'USER-DEFINED') {
  const e = await query(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid
      WHERE ty.typname = $1 ORDER BY e.enumsortorder`, [t.rows[0].udt_name]);
  console.log('enum values:', e.rows.map((r) => r.enumlabel).join(', '));
  console.log(e.rows.some((r) => r.enumlabel === 'RATING_RECEIVED')
    ? 'RATING_RECEIVED exists' : 'RATING_RECEIVED is MISSING (I will give you a migration)');
}
console.log(bad ? '\nSchema differs from my assumptions: paste this output.' : '\nColumns match.');
await pool.end();