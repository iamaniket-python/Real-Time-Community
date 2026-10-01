import { query, pool } from '../src/config/db.js';

const need = {
  helper_profiles: ['id', 'user_id', 'verification_status', 'is_available'],
  admin_actions: ['admin_id', 'action', 'target_type', 'target_id', 'details'],
  refresh_tokens: ['user_id', 'revoked_at'],
  users: ['id', 'name', 'email', 'role', 'status', 'created_at'],
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
console.log(bad ? '\nDiffers from my assumptions: paste this output.' : '\nColumns match.');
await pool.end();