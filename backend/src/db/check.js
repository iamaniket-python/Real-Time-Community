import { pool } from '../config/db.js';

const info = await pool.query('select current_database() as db, current_schema() as schema');
console.log(info.rows[0]);

const tables = await pool.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by 1",
);
console.log(tables.rows.map((r) => r.table_name));

await pool.end();