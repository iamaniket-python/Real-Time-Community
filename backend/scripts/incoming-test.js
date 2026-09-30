import { pool } from '../src/config/db.js';

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
  const r = await call('POST', '/auth/register', null, { name: `${role} Tester`, email, password: 'Str0ngPass123', role });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return { email, token: r.body.data.accessToken };
}

const lat0 = 20 + Math.random() * 30; // random origin so old data never interferes
const lng0 = 60 + Math.random() * 30;
const cats = (await call('GET', '/categories')).body.data.categories;
const [catA, catB] = [cats[0].id, cats[1].id];

const user1 = await register('USER');
const user2 = await register('USER');
const near = await register('HELPER');   // ~1 km, catA
const far = await register('HELPER');    // ~20 km, catA
const other = await register('HELPER');  // ~1 km, catB
const helpers = [near, far, other];

await pool.query(`UPDATE helper_profiles SET verification='VERIFIED'
                   WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [helpers.map((h) => h.email)]);
async function goOnline(h, dLat, categoryId) {
  await call('PUT', '/helpers/categories', h.token, { categoryIds: [categoryId] });
  const r = await call('PATCH', '/helpers/availability', h.token, { isAvailable: true, lat: lat0 + dLat, lng: lng0 });
  if (r.status !== 200) throw new Error(JSON.stringify(r.body));
}
await goOnline(near, 0.009, catA);
await goOnline(far, 0.18, catA);
await goOnline(other, 0.009, catB);

const newReq = (token, title) => call('POST', '/requests', token,
  { categoryId: catA, title, description: 'Incoming test request.', address: 'Secret Street 12', lat: lat0, lng: lng0 });
const incoming = (h) => call('GET', '/helpers/incoming', h.token);

const r1 = await newReq(user1.token, 'First request');
const id1 = r1.body.data.request.id;

let a = await incoming(near);
const item = (a.body.data?.items ?? []).find((i) => i.id === id1);
check('nearby helper sees the request', Boolean(item), JSON.stringify(a.body));
check('distance is about 1 km', item && Math.abs(item.distanceKm - 1) < 0.3, String(item?.distanceKm));
check('no exact location, address or user id leaked',
  item && item.lat === undefined && item.lng === undefined && item.address === undefined &&
  item.userId === undefined && item.userFirstName === 'USER');
check('coordinates are rounded',
  item && Number(item.approxLat.toFixed(2)) === item.approxLat && Number(item.approxLng.toFixed(2)) === item.approxLng);

check('far helper does not see it', !((await incoming(far)).body.data.items).some((i) => i.id === id1));
check('wrong-category helper does not see it', !((await incoming(other)).body.data.items).some((i) => i.id === id1));

const farAccept = await call('POST', `/requests/${id1}/accept`, far.token);
check('far helper cannot accept: OUT_OF_RANGE', farAccept.status === 409 && farAccept.body.errorCode === 'OUT_OF_RANGE', JSON.stringify(farAccept.body));
const catAccept = await call('POST', `/requests/${id1}/accept`, other.token);
check('wrong category cannot accept', catAccept.status === 403 && catAccept.body.errorCode === 'CATEGORY_MISMATCH');

const rej = await call('POST', `/requests/${id1}/reject`, near.token);
check('reject works', rej.status === 200);
check('rejecting again is fine (idempotent)', (await call('POST', `/requests/${id1}/reject`, near.token)).status === 200);
check('rejected request disappears for that helper', !((await incoming(near)).body.data.items).some((i) => i.id === id1));
const unknown = await call('POST', '/requests/00000000-0000-4000-8000-000000000000/reject', near.token);
check('rejecting an unknown request is 404', unknown.status === 404);

const stillOpen = await call('GET', `/requests/${id1}`, user1.token);
check('request stays SEARCHING for others', stillOpen.body.data.request.status === 'SEARCHING');

const r2 = await newReq(user2.token, 'Second request');
const id2 = r2.body.data.request.id;
check('helper sees the new request', ((await incoming(near)).body.data.items).some((i) => i.id === id2));
check('near helper accepts in range', (await call('POST', `/requests/${id2}/accept`, near.token)).status === 200);
const busy = await incoming(near);
check('busy helper gets reason BUSY', busy.body.data.reason === 'BUSY' && busy.body.data.items.length === 0);

await call('PATCH', '/helpers/availability', far.token, { isAvailable: false });
check('offline helper gets reason OFFLINE', (await incoming(far)).body.data.reason === 'OFFLINE');
check('users cannot call helper incoming', (await call('GET', '/helpers/incoming', user1.token)).status === 403);

// tidy up
await call('POST', `/requests/${id1}/cancel`, user1.token, {});
await call('POST', `/requests/${id2}/cancel`, user2.token, {});
await pool.query(`UPDATE helper_profiles SET is_available = false
                   WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [helpers.map((h) => h.email)]);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
await pool.end();
process.exit(failures ? 1 : 0);