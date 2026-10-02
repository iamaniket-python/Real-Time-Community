import { query, pool } from '../src/config/db.js';

const tables = ['helper_profiles', 'admin_actions', 'categories', 'ratings', 'reports',
  'notifications', 'refresh_tokens', 'request_status_history'];

for (const t of tables) {
  const { rows } = await query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [t]);
  console.log(`\n${t}:`);
  for (const r of rows) {
    const type = r.data_type === 'USER-DEFINED' ? `enum ${r.udt_name}` : r.data_type;
    console.log(`  ${r.column_name} | ${type} | ${r.is_nullable === 'NO' ? 'NOT NULL' : 'null ok'}${r.column_default ? ' | default' : ''}`);
  }
}
await pool.end();