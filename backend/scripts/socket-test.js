import { io } from 'socket.io-client';
import { pool } from '../src/config/db.js';

const API = 'http://localhost:5000/api';
const WS = 'http://localhost:5000';
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
  const r = await call('POST', '/auth/register', null, { name: `${role} Tester`, email, password: 'Str0ngPass123', role });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return { email, token: r.body.data.accessToken };
}

const sockets = [];
// Resolves { ready } on success or { error } with the server's errorCode
function connect(token) {
  return new Promise((resolve) => {
    const s = io(WS, { auth: token === undefined ? {} : { token }, reconnection: false, forceNew: true });
    sockets.push(s);
    const timer = setTimeout(() => resolve({ error: 'TIMEOUT', socket: s }), 5000);
    s.on('socket:ready', (info) => { clearTimeout(timer); resolve({ ready: info, socket: s }); });
    s.on('connect_error', (err) => { clearTimeout(timer); resolve({ error: err.data?.errorCode ?? err.message, socket: s }); });
  });
}
const ask = (s, event, payload) => new Promise((resolve) => s.emit(event, payload, resolve));

const user1 = await register('USER');
const user2 = await register('USER');
const helper = await register('HELPER');
const suspended = await register('USER');

// --- authentication ---
check('no token is rejected', (await connect(undefined)).error === 'UNAUTHORIZED');
check('garbage token is rejected', (await connect('not-a-token')).error === 'INVALID_TOKEN');

const c1 = await connect(user1.token);
check('valid token connects and gets socket:ready', c1.ready?.role === 'USER', JSON.stringify(c1));
const c1b = await connect(user1.token);
check('a second connection (another tab) also works', c1b.ready?.userId === c1.ready?.userId);
const ch = await connect(helper.token);
check('helper connects with role HELPER', ch.ready?.role === 'HELPER');

await pool.query(`UPDATE users SET status = 'SUSPENDED' WHERE email = $1`, [suspended.email]);
check('suspended account cannot connect', (await connect(suspended.token)).error === 'ACCOUNT_INACTIVE');

// --- request room access ---
const catId = (await call('GET', '/categories')).body.data.categories[0].id;
const req = await call('POST', '/requests', user1.token,
  { categoryId: catId, title: 'Socket room test', description: 'Testing the request room.', lat: 25.6, lng: 85.1 });
const requestId = req.body.data.request.id;

check('owner can join own request room', (await ask(c1.socket, 'request:join', { requestId })).ok === true);
check('same owner, other tab, can join too', (await ask(c1b.socket, 'request:join', { requestId })).ok === true);

const c2 = await connect(user2.token);
const other = await ask(c2.socket, 'request:join', { requestId });
check("another user cannot join someone else's request room", other.ok === false && other.errorCode === 'REQUEST_NOT_FOUND');
const notAssigned = await ask(ch.socket, 'request:join', { requestId });
check('a helper who has not accepted cannot join', notAssigned.ok === false && notAssigned.errorCode === 'REQUEST_NOT_FOUND');
check('malformed id is rejected', (await ask(c1.socket, 'request:join', { requestId: 'nope' })).errorCode === 'VALIDATION_ERROR');
check('unknown id gives REQUEST_NOT_FOUND',
  (await ask(c1.socket, 'request:join', { requestId: '00000000-0000-4000-8000-000000000000' })).errorCode === 'REQUEST_NOT_FOUND');
check('leaving a room works', (await ask(c1.socket, 'request:leave', { requestId })).ok === true);

// --- rate limit on join/leave (30 per minute per socket) ---
const fresh = await connect(user1.token);
let limited = false;
for (let i = 0; i < 35; i++) {
  const r = await ask(fresh.socket, 'request:join', { requestId });
  if (r.errorCode === 'RATE_LIMITED') { limited = true; break; }
}
check('join spam is rate limited', limited);

// tidy up
await call('POST', `/requests/${requestId}/cancel`, user1.token, {});
await pool.query(`UPDATE users SET status = 'ACTIVE' WHERE email = $1`, [suspended.email]);
sockets.forEach((s) => s.close());

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
await pool.end();
process.exit(failures ? 1 : 0);