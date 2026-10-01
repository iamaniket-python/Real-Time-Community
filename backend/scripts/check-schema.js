import { query, pool } from '../src/config/db.js';

const tables = ['ratings', 'reports', 'admin_actions', 'helper_profiles', 'users', 'messages', 'notifications'];

for (const t of tables) {
  console.log(`\n=== ${t} columns ===`);
  const cols = await query(
    `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`, [t]);
  console.table(cols.rows);

  console.log(`=== ${t} constraints ===`);
  const cons = await query(
    `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint WHERE conrelid = $1::regclass`, [`public.${t}`]);
  console.table(cons.rows);
}

console.log('\n=== notification_type enum values (if it exists) ===');
const en = await query(
  `SELECT t.typname, e.enumlabel FROM pg_type t
     JOIN pg_enum e ON e.enumtypid = t.oid ORDER BY t.typname, e.enumsortorder`);
console.table(en.rows);

await pool.end();