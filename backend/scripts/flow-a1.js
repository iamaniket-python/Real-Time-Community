import { writeFileSync } from 'node:fs';
import { pool } from '../src/config/db.js';
import { call, check, register, failures } from './flow-lib.js';

const login = await call('POST', '/auth/login', null,
  { email: process.env.ADMIN_SEED_EMAIL, password: process.env.ADMIN_SEED_PASSWORD });
const admin = login.body?.data?.accessToken;
check('admin login', login.status === 200 && Boolean(admin), login.body?.errorCode);
if (!admin) { await pool.end(); process.exit(1); }

const user = await register('USER');
const helper = await register('HELPER');
const other = await register('USER');
const hp = (await pool.query(
  'SELECT hp.id FROM helper_profiles hp JOIN users u ON u.id = hp.user_id WHERE u.email = $1',
  [helper.email])).rows[0].id;
const otherId = (await pool.query('SELECT id FROM users WHERE email = $1', [other.email])).rows[0].id;

const pending = await call('GET', '/admin/helpers?status=PENDING&limit=50', admin);
check('helper is in PENDING list', pending.body?.data?.items?.some((h) => h.id === hp), pending.body);
const ver = await call('POST', `/admin/helpers/${hp}/verify`, admin, { reason: 'flow test' });
check('admin verifies helper', ver.status === 200 && ver.body.data.verificationStatus === 'VERIFIED', ver.body);
const again = await call('POST', `/admin/helpers/${hp}/verify`, admin, {});
check('verify twice is 409', again.status === 409, again.body);

const categoryId = (await call('GET', '/categories')).body.data.categories[0].id;
await call('PUT', '/helpers/categories', helper.token, { categoryIds: [categoryId] });
const av = await call('PATCH', '/helpers/availability', helper.token,
  { isAvailable: true, lat: 25.61, lng: 85.14 });
check('helper goes available', av.status === 200, av.body);

const created = await call('POST', '/requests', user.token,
  { categoryId, title: 'Flow test', description: 'Flow test request for uploads.', lat: 25.6093, lng: 85.1376 });
check('create request', created.status === 201, created.body);
const reqId = created.body?.data?.request?.id;
check('helper accepts', (await call('POST', `/requests/${reqId}/accept`, helper.token)).status === 200);

writeFileSync(new URL('./flow-state.json', import.meta.url),
  JSON.stringify({ admin, user, helper, other, hp, otherId, categoryId, reqId }));
console.log(failures ? `\n${failures} FAILED` : '\nflow-a1 passed');
await pool.end();
process.exit(failures ? 1 : 0);