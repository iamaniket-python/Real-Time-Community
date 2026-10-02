import { readFileSync } from 'node:fs';
import { pool } from '../src/config/db.js';
import { call, check, failures } from './flow-lib.js';

const { admin, other, hp, otherId, categoryId } = JSON.parse(
  readFileSync(new URL('./flow-state.json', import.meta.url), 'utf8'));
const PW = 'Str0ngPass123';
const newReq = (t) => call('POST', '/requests', other.token,
  { categoryId, title: t, description: 'Request created by the flow test.', lat: 25.6093, lng: 85.1376 });

const susp = await call('POST', `/admin/helpers/${hp}/suspend`, admin, { reason: 'flow test' });
check('admin suspends helper', susp.status === 200 && susp.body?.data?.verificationStatus === 'SUSPENDED', susp.body);
const av = (await pool.query('SELECT is_available FROM helper_profiles WHERE id = $1', [hp])).rows[0];
check('suspended helper is unavailable', av.is_available === false);
check('suspend twice is 409', (await call('POST', `/admin/helpers/${hp}/suspend`, admin, {})).status === 409);
check('admin reinstates helper', (await call('POST', `/admin/helpers/${hp}/verify`, admin, {})).status === 200);

const r1 = await newReq('Block me');
check('outsider creates request', r1.status === 201, r1.body);
const blk = await call('POST', `/admin/users/${otherId}/block`, admin, { reason: 'flow test' });
check('block cancels 1 request', blk.status === 200 && blk.body?.data?.cancelledRequests === 1, blk.body);
const st = (await pool.query('SELECT status FROM help_requests WHERE id = $1', [r1.body?.data?.request?.id])).rows[0];
check('request is CANCELLED', st?.status === 'CANCELLED', st);
const h = await pool.query(
  `SELECT 1 FROM request_status_history WHERE request_id = $1 AND to_status = 'CANCELLED'`, [r1.body?.data?.request?.id]);
check('history row written', h.rowCount === 1);
check('blocked token rejected', (await call('GET', '/auth/me', other.token)).status !== 200);
check('blocked user cannot log in', (await call('POST', '/auth/login', null, { email: other.email, password: PW })).status !== 200);
check('block twice is 409', (await call('POST', `/admin/users/${otherId}/block`, admin, {})).status === 409);
check('admin unblocks', (await call('POST', `/admin/users/${otherId}/unblock`, admin, {})).status === 200);

const login = await call('POST', '/auth/login', null, { email: other.email, password: PW });
check('unblocked user logs in', login.status === 200, login.body?.errorCode);
const tok = login.body?.data?.accessToken;
const r2 = await call('POST', '/requests', tok, { categoryId, title: 'Delete me', description: 'Request cancelled by account deletion.', lat: 25.6093, lng: 85.1376 });
check('new request created', r2.status === 201, r2.body);
const bad = await call('DELETE', '/auth/account', tok, { password: 'wrong-password-1' });
check('wrong password is 401', bad.status === 401, bad.body);
const del = await call('DELETE', '/auth/account', tok, { password: PW });
check('account deleted, 1 request cancelled', del.status === 200 && del.body?.data?.cancelledRequests === 1, del.body);
check('deleted user cannot log in', (await call('POST', '/auth/login', null, { email: other.email, password: PW })).status !== 200);

const audit = await call('GET', '/admin/audit-log?limit=50', admin);
const acts = new Set((audit.body?.data?.items ?? []).map((a) => a.action));
for (const a of ['HELPER_VERIFY', 'HELPER_SUSPEND', 'USER_BLOCK', 'USER_UNBLOCK']) check(`audit has ${a}`, acts.has(a), [...acts]);

console.log(failures ? `\n${failures} FAILED` : '\nflow-b2 passed');
await pool.end();
process.exit(failures ? 1 : 0);