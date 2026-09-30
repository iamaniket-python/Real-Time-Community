import { pool } from '../src/config/db.js';

const API = 'http://localhost:5000/api';

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

async function register(role) {
  const email = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const r = await call('POST', '/auth/register', null,
    { name: `${role} Test`, email, password: 'Str0ngPass123', role });
  if (r.status !== 201) throw new Error(`register failed: ${JSON.stringify(r.body)}`);
  return { email, token: r.body.data.accessToken };
}

const user = await register('USER');
const h1 = await register('HELPER');
const h2 = await register('HELPER');

// Verify helpers directly (no admin endpoint yet)
await pool.query(
  `UPDATE helper_profiles SET verification = 'VERIFIED'
    WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [[h1.email, h2.email]]);

const categoryId = (await call('GET', '/categories')).body.data.categories[0].id;
for (const h of [h1, h2]) {
  await call('PUT', '/helpers/categories', h.token, { categoryIds: [categoryId] });
  const a = await call('PATCH', '/helpers/availability', h.token, { isAvailable: true, lat: 25.61, lng: 85.14 });
  if (a.status !== 200) throw new Error(`availability failed: ${JSON.stringify(a.body)}`);
}

const created = await call('POST', '/requests', user.token, {
  categoryId, title: 'Race test request', description: 'Two helpers accept at once.',
  lat: 25.6093, lng: 85.1376,
});
const requestId = created.body.data.request.id;
console.log('request created:', created.body.data.request.status);

// Both accepts fire at the same time
const [a, b] = await Promise.all([
  call('POST', `/requests/${requestId}/accept`, h1.token),
  call('POST', `/requests/${requestId}/accept`, h2.token),
]);
console.log('helper 1 ->', a.status, a.body.errorCode ?? a.body.data.request.status);
console.log('helper 2 ->', b.status, b.body.errorCode ?? b.body.data.request.status);

const conv = await pool.query('SELECT count(*)::int AS n FROM conversations WHERE request_id = $1', [requestId]);
console.log('conversations for request:', conv.rows[0].n);
console.log(
  [a.status, b.status].sort().join(',') === '200,409' && conv.rows[0].n === 1
    ? 'PASS: exactly one helper won'
    : 'FAIL',
);
await pool.end();