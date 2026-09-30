  import { pool } from '../config/db.js';

  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');
  console.log('schema reset');
  await pool.end();