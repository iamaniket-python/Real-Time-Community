import { pool } from '../config/db.js';

await pool.query('DROP TABLE IF EXISTS schema_migrations');
console.log('migration record cleared');
await pool.end();