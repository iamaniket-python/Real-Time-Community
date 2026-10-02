import { query, pool } from '../src/config/db.js';

const need = {
  categories: ['id', 'name', 'is_active'],
  help_requests: ['id', 'user_id', 'title', 'status', 'category_id', 'accepted_helper_id', 'created_at'],
};

for (const [table, cols] of Object.entries(need)) {
  const { rows } = await query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [table]);
  console.log(`\n${table}:`);
  console.table(rows);
  const have = new Set(rows.map((r) => r.column_name));
  const missing = cols.filter((c) => !have.has(c));
  console.log(missing.length ? `MISSING: ${missing.join(', ')}` : 'Assumed columns present.');
}
await pool.end();