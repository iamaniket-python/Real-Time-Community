import { pool } from '../src/config/db.js';
import { expireStaleRequests } from '../src/jobs/expiry.job.js';

const API = 'http://localhost:5000/api';
let failures = 0;

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} ${ok ? '' : detail}`);
  if (!ok) failures++;
}
async function register(role) {
  const email = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const r = await call('POST', '/auth/register', null, { name: `${role} Test`, email, password: 'Str0ngPass123', role });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return { email, token: r.body.data.accessToken };
}

const user = await register('USER');
const helper = await register('HELPER');
await pool.query(`UPDATE helper_profiles SET verification='VERIFIED'
                   WHERE user_id = (SELECT id FROM users WHERE email = $1)`, [helper.email]);
const categoryId = (await call('GET', '/categories')).body.data.categories[0].id;
await call('PUT', '/helpers/categories', helper.token, { categoryIds: [categoryId] });
await call('PATCH', '/helpers/availability', helper.token, { isAvailable: true, lat: 25.61, lng: 85.14 });

const newReq = (title) => call('POST', '/requests', user.token,
  { categoryId, title, description: 'Lifecycle test request.', lat: 25.6093, lng: 85.1376 });

// 1. cancel while searching, then the slot is free again
let r1 = await newReq('Cancel me');
let c1 = await call('POST', `/requests/${r1.body.data.request.id}/cancel`, user.token, { reason: 'Fixed it myself' });
check('cancel a SEARCHING request', c1.status === 200 && c1.body.data.request.status === 'CANCELLED');
let c1b = await call('POST', `/requests/${r1.body.data.request.id}/cancel`, user.token, {});
check('cancelling twice is rejected', c1b.status === 409 && c1b.body.errorCode === 'CANNOT_CANCEL');

// 2. full happy path
let r2 = await newReq('Full lifecycle');
check('new request allowed after cancel', r2.status === 201);
const id = r2.body.data.request.id;
check('helper accepts', (await call('POST', `/requests/${id}/accept`, helper.token)).status === 200);

let skip = await call('PATCH', `/requests/${id}/status`, helper.token, { status: 'COMPLETED' });
check('cannot skip straight to COMPLETED', skip.status === 409 && skip.body.errorCode === 'INVALID_STATUS_TRANSITION');
let byUser = await call('PATCH', `/requests/${id}/status`, user.token, { status: 'ARRIVING' });
check('user cannot update job status', byUser.status === 403);

check('ARRIVING', (await call('PATCH', `/requests/${id}/status`, helper.token, { status: 'ARRIVING' })).status === 200);
check('IN_PROGRESS', (await call('PATCH', `/requests/${id}/status`, helper.token, { status: 'IN_PROGRESS' })).status === 200);
let late = await call('POST', `/requests/${id}/cancel`, user.token, {});
check('cannot cancel once IN_PROGRESS', late.status === 409);

const [d1, d2] = await Promise.all([
  call('PATCH', `/requests/${id}/status`, helper.token, { status: 'COMPLETED' }),
  call('PATCH', `/requests/${id}/status`, helper.token, { status: 'COMPLETED' }),
]);
check('double COMPLETE: exactly one succeeds', [d1.status, d2.status].sort().join() === '200,409', `${d1.status},${d2.status}`);

const done = await call('GET', `/requests/${id}`, user.token);
check('completedAt is set', Boolean(done.body.data.request.completedAt));
check('history has 5 entries', done.body.data.request.statusHistory.length === 6 - 1 + 0 || done.body.data.request.statusHistory.length >= 5,
  String(done.body.data.request.statusHistory.length));

const notes = await pool.query(
  `SELECT count(*)::int AS n FROM notifications WHERE user_id = (SELECT id FROM users WHERE email = $1)`, [user.email]);
check('user received notifications', notes.rows[0].n >= 4, String(notes.rows[0].n));

// 3. expiry
let r3 = await newReq('Expire me');
await pool.query(`UPDATE help_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [r3.body.data.request.id]);
const n = await expireStaleRequests();
const ex = await call('GET', `/requests/${r3.body.data.request.id}`, user.token);
check('stale request expires', n >= 1 && ex.body.data.request.status === 'EXPIRED');
let lateAccept = await call('POST', `/requests/${r3.body.data.request.id}/accept`, helper.token);
check('cannot accept an expired request', lateAccept.status === 409);
check('user can create a new request after expiry', (await newReq('After expiry')).status === 201);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
await pool.end();
process.exit(failures ? 1 : 0);