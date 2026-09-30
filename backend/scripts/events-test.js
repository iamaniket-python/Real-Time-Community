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
const connect = (token) => new Promise((resolve, reject) => {
  const s = io(WS, { auth: { token }, reconnection: false, forceNew: true });
  sockets.push(s);
  s.on('socket:ready', () => resolve(s));
  s.on('connect_error', (e) => reject(new Error(e.data?.errorCode ?? e.message)));
});
const record = (s) => { const log = []; s.onAny((event, payload) => log.push({ event, payload })); return log; };
const count = (log, event) => log.filter((e) => e.event === event).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ask = (s, event, payload) => new Promise((resolve) => s.emit(event, payload, resolve));
// Resolves with the payload, or null after ms (used both to wait and to assert "nothing arrives")
const waitFor = (s, event, ms = 4000) => new Promise((resolve) => {
  const timer = setTimeout(() => { s.off(event, handler); resolve(null); }, ms);
  function handler(p) { clearTimeout(timer); s.off(event, handler); resolve(p); }
  s.on(event, handler);
});

const lat0 = 20 + Math.random() * 30; // random origin so old data never interferes
const lng0 = 60 + Math.random() * 30;
const catId = (await call('GET', '/categories')).body.data.categories[0].id;

const owner = await register('USER');
const other = await register('USER');
const hA = await register('HELPER'); // ~1 km
const hB = await register('HELPER'); // ~2 km
const hF = await register('HELPER'); // ~20 km, out of range

await pool.query(`UPDATE helper_profiles SET verification = 'VERIFIED'
                   WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`,
  [[hA.email, hB.email, hF.email]]);
async function goOnline(h, dLat) {
  await call('PUT', '/helpers/categories', h.token, { categoryIds: [catId] });
  const r = await call('PATCH', '/helpers/availability', h.token, { isAvailable: true, lat: lat0 + dLat, lng: lng0 });
  if (r.status !== 200) throw new Error(JSON.stringify(r.body));
}
await goOnline(hA, 0.009);
await goOnline(hB, 0.018);
await goOnline(hF, 0.18);

const tab1 = await connect(owner.token);
const tab2 = await connect(owner.token); // same user, second tab
const otherSock = await connect(other.token);
const sockA = await connect(hA.token);
const sockB = await connect(hB.token);
const sockF = await connect(hF.token);
const logT1 = record(tab1);
const logT2 = record(tab2);
const logA = record(sockA);

const create = (token, title) => call('POST', '/requests', token,
  { categoryId: catId, title, description: 'Realtime test request.', address: 'Secret Street 12', lat: lat0, lng: lng0 });

// ---- 1. new request reaches the right helpers ----
{
  const wA = waitFor(sockA, 'request:new');
  const wB = waitFor(sockB, 'request:new');
  const wF = waitFor(sockF, 'request:new', 1500);
  const nA = waitFor(sockA, 'notification:new');
  var r1 = await create(owner.token, 'Realtime one');
  var id1 = r1.body.data.request.id;
  const [evA, evB, evF, noteA] = await Promise.all([wA, wB, wF, nA]);
  check('helper A (near) receives request:new', evA?.id === id1, JSON.stringify(evA));
  check('helper B (near) receives request:new', evB?.id === id1);
  check('helper out of range does not receive it', evF === null);
  check('request:new hides exact location and address',
    evA && evA.lat === undefined && evA.lng === undefined && evA.address === undefined &&
    evA.userId === undefined && evA.approxLat !== undefined);
  check('helper gets notification:new with unread count',
    noteA?.notification?.type === 'NEW_REQUEST_NEARBY' && noteA.unreadCount === 1, JSON.stringify(noteA));
}

// ---- 2. accept: owner (both tabs) told, losing helper told, winner not ----
{
  const a1 = waitFor(tab1, 'request:accepted');
  const a2 = waitFor(tab2, 'request:accepted');
  const gone = waitFor(sockB, 'request:unavailable');
  const un = waitFor(tab1, 'notification:new');
  const acc = await call('POST', `/requests/${id1}/accept`, hA.token);
  check('helper A accepts', acc.status === 200, JSON.stringify(acc.body));
  const [e1, e2, g, n] = await Promise.all([a1, a2, gone, un]);
  check('both owner tabs receive request:accepted', e1?.requestId === id1 && e2?.requestId === id1);
  check('losing helper is told: TAKEN', g?.requestId === id1 && g.reason === 'TAKEN');
  check('owner gets a REQUEST_ACCEPTED notification', n?.notification?.type === 'REQUEST_ACCEPTED');
  await sleep(600);
  check('winner is not told the request is unavailable', count(logA, 'request:unavailable') === 0);
  check('each tab got request:accepted exactly once', count(logT1, 'request:accepted') === 1 && count(logT2, 'request:accepted') === 1);
}

// ---- 3. status changes: one event per tab, even when in two rooms ----
{
  check('owner joins request room', (await ask(tab1, 'request:join', { requestId: id1 })).ok === true);
  check('helper joins request room', (await ask(sockA, 'request:join', { requestId: id1 })).ok === true);
  const sc = waitFor(tab1, 'request:status_changed');
  await call('PATCH', `/requests/${id1}/status`, hA.token, { status: 'ARRIVING' });
  const s = await sc;
  check('owner receives status_changed ARRIVING', s?.status === 'ARRIVING' && s.requestId === id1);
  await sleep(600);
  check('exactly one event per tab (no duplicate from two rooms)',
    count(logT1, 'request:status_changed') === 1 && count(logT2, 'request:status_changed') === 1);
  check('helper own tab also synced', count(logA, 'request:status_changed') === 1);
}

// ---- 4. notifications API and cross-tab badge sync ----
{
  const list = await call('GET', '/notifications', owner.token);
  const items = list.body.data.items;
  const before = list.body.data.unreadCount;
  check('list returns notifications and unreadCount', items.length >= 2 && before >= 2, JSON.stringify(list.body));

  const cnt = waitFor(tab2, 'notification:count');
  const rd = await call('PATCH', `/notifications/${items[0].id}/read`, owner.token);
  const c = await cnt;
  check('marking one read syncs the other tab', c?.unreadCount === before - 1 && rd.body.data.unreadCount === before - 1);
  check('another user cannot mark it', (await call('PATCH', `/notifications/${items[0].id}/read`, other.token)).status === 404);

  const p1 = await call('GET', '/notifications?limit=1', owner.token);
  check('pagination returns a cursor', p1.body.data.items.length === 1 && Boolean(p1.body.data.nextCursor));

  const cnt2 = waitFor(tab1, 'notification:count');
  await call('PATCH', '/notifications/read-all', owner.token);
  check('read-all sets the badge to 0 live', (await cnt2)?.unreadCount === 0);
  check('unread-count endpoint agrees', (await call('GET', '/notifications/unread-count', owner.token)).body.data.unreadCount === 0);
  check('unread=true filter returns nothing', (await call('GET', '/notifications?unread=true', owner.token)).body.data.items.length === 0);
  check('notifications need login', (await call('GET', '/notifications')).status === 401);
}

// ---- 5. finish the job ----
for (const status of ['IN_PROGRESS', 'COMPLETED']) {
  await call('PATCH', `/requests/${id1}/status`, hA.token, { status });
}

// ---- 6. cancel while searching: offered helpers are told ----
{
  const wA = waitFor(sockA, 'request:new');
  const wB = waitFor(sockB, 'request:new');
  const r2 = await create(owner.token, 'Cancel me');
  const id2 = r2.body.data.request.id;
  await Promise.all([wA, wB]);
  const gone = waitFor(sockB, 'request:unavailable');
  await call('POST', `/requests/${id2}/cancel`, owner.token, {});
  const g = await gone;
  check('offered helpers are told: CANCELLED', g?.requestId === id2 && g.reason === 'CANCELLED', JSON.stringify(g));
}

// ---- 7. cancel after accept: the helper is told ----
{
  const wA = waitFor(sockA, 'request:new');
  const r3 = await create(owner.token, 'Cancel after accept');
  const id3 = r3.body.data.request.id;
  await wA;
  await call('POST', `/requests/${id3}/accept`, hA.token);
  const cancelled = waitFor(sockA, 'request:cancelled');
  await call('POST', `/requests/${id3}/cancel`, owner.token, {});
  const cc = await cancelled;
  check('accepted helper receives request:cancelled', cc?.requestId === id3 && cc.by === 'USER', JSON.stringify(cc));
}

// ---- 8. expiry pushed live by the server's background job ----
{
  const wA = waitFor(sockA, 'request:new');
  const r4 = await create(other.token, 'Expire me');
  const id4 = r4.body.data.request.id;
  await wA;
  const exp = waitFor(otherSock, 'request:status_changed', 25000);
  const gone = waitFor(sockA, 'request:unavailable', 25000);
  await pool.query(`UPDATE help_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [id4]);
  console.log('      waiting up to 25 s for the server expiry job (runs every 15 s)...');
  const [e, g] = await Promise.all([exp, gone]);
  check('owner is told the request expired', e?.status === 'EXPIRED' && e.requestId === id4, JSON.stringify(e));
  check('offered helper is told: EXPIRED', g?.requestId === id4 && g.reason === 'EXPIRED', JSON.stringify(g));
}

// tidy up
await pool.query(`UPDATE helper_profiles SET is_available = false
                   WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`,
  [[hA.email, hB.email, hF.email]]);
sockets.forEach((s) => s.close());

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
await pool.end();
process.exit(failures ? 1 : 0);