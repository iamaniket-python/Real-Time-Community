import { query, pool } from '../src/config/db.js';

for (const t of ['reports', 'admin_actions']) {
  const { rows } = await query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [t]);
  console.log(`\n${t}:`);
  console.table(rows);
}

const e = await query(`SELECT unnest(enum_range(NULL::report_status))::text AS value`);
console.log('report_status values:', e.rows.map((r) => r.value).join(', '));
await pool.end();