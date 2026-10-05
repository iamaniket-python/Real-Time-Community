import { pool } from '../src/config/db.js';

const tables = [
  'seller_profiles', 'shop_images', 'products', 'carts', 'cart_items',
  'orders', 'order_items', 'order_status_history', 'payments',
  'webhook_events', 'shop_reviews',
];

const applied = await pool.query(
  "SELECT name FROM schema_migrations WHERE name >= '008' ORDER BY name",
);
console.log('applied migrations (008+):', applied.rows.map((r) => r.name).join(', '));

for (const t of tables) {
  const { rows } = await pool.query('SELECT to_regclass($1) AS t', [`public.${t}`]);
  console.log(t.padEnd(22), rows[0].t ? 'OK' : 'MISSING');
}

const cols = await pool.query(
  `SELECT column_name, data_type, udt_name FROM information_schema.columns
   WHERE table_name = 'users' AND column_name IN ('id', 'role', 'phone')
   ORDER BY column_name`,
);
console.table(cols.rows);

await pool.end();