import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';

const categories = [
  'Electrician',
  'Plumber',
  'Mechanic',
  'Delivery Help',
  'Computer/IT Help',
  'Home Appliance Repair',
  'Emergency Assistance',
  'Lost & Found',
  'Other',
];

for (const name of categories) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await pool.query(
    'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
    [name, slug],
  );
}
console.log(`categories ready (${categories.length})`);

if (env.ADMIN_SEED_EMAIL && env.ADMIN_SEED_PASSWORD) {
  const hash = await bcrypt.hash(env.ADMIN_SEED_PASSWORD, 12);
  const { rowCount } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Admin', $1, $2, 'ADMIN')
     ON CONFLICT DO NOTHING`,
    [env.ADMIN_SEED_EMAIL.toLowerCase(), hash],
  );
  console.log(rowCount ? 'admin created' : 'admin already exists');
} else {
  console.log('ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not set, skipping admin');
}

await pool.end();