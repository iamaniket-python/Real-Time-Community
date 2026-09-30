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

// Random origin so leftover helpers from earlier runs never interfere
const lat0 = 20 + Math.random() * 30;
const lng0 = 60 + Math.random() * 30;
const cats = (await call('GET', '/categories')).body.data.categories;
const [catA, catB] = [cats[0].id, cats[1].id];

const user = await register('USER');
const near = await register('HELPER');   // ~1 km
const mid = await register('HELPER');    // ~4 km
const far = await register('HELPER');    // ~20 km
const wrongCat = await register('HELPER'); // ~1 km but different service
const all = [near, mid, far, wrongCat];

await pool.query(`UPDATE helper_profiles SET verification='VERIFIED'
                   WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [all.map((h) => h.email)]);

async function goOnline(h, dLat, categoryId) {
  await call('PUT', '/helpers/categories', h.token, { categoryIds: [categoryId] });
  const r = await call('PATCH', '/helpers/availability', h.token,
    { isAvailable: true, lat: lat0 + dLat, lng: lng0 });
  if (r.status !== 200) throw new Error(JSON.stringify(r.body));
}
await goOnline(near, 0.009, catA);
await goOnline(mid, 0.036, catA);
await goOnline(far, 0.18, catA);
await goOnline(wrongCat, 0.009, catB);

const search = (radius) =>
  call('GET', `/helpers/nearby?lat=${lat0}&lng=${lng0}&categoryId=${catA}${radius ? `&radiusKm=${radius}` : ''}`, user.token);

const r5 = await search(5);
const d5 = r5.body.data?.helpers ?? [];
check('radius 5 km finds exactly the 2 close helpers', r5.status === 200 && d5.length === 2, JSON.stringify(d5));
check('sorted nearest first', d5.length === 2 && d5[0].distanceKm < d5[1].distanceKm);
check('distances are about 1 km and 4 km',
  d5.length === 2 && Math.abs(d5[0].distanceKm - 1) < 0.3 && Math.abs(d5[1].distanceKm - 4) < 0.3,
  d5.map((h) => h.distanceKm).join(','));
check('wrong-category helper excluded', !d5.some((h) => h.id === undefined));
check('coordinates are rounded (privacy)',
  d5.every((h) => Number(h.approxLat.toFixed(2)) === h.approxLat && Number(h.approxLng.toFixed(2)) === h.approxLng));
check('no exact position or user id leaked',
  d5.every((h) => h.lat === undefined && h.lng === undefined && h.userId === undefined && h.email === undefined));

const r25 = await search(25);
check('radius 25 km also finds the far helper', (r25.body.data?.helpers ?? []).length === 3);

const rDefault = await search();
check('default radius (5 km) applies when none is given', (rDefault.body.data?.helpers ?? []).length === 2);

await call('PATCH', '/helpers/availability', mid.token, { isAvailable: false });
const rOff = await search(5);
check('offline helper disappears', (rOff.body.data?.helpers ?? []).length === 1);

await pool.query(`UPDATE helper_profiles SET location_updated_at = now() - interval '2 hours'
                   WHERE user_id = (SELECT id FROM users WHERE email = $1)`, [near.email]);
const rStale = await search(5);
check('helper with a stale location disappears', (rStale.body.data?.helpers ?? []).length === 0);

const noAuth = await call('GET', `/helpers/nearby?lat=${lat0}&lng=${lng0}&categoryId=${catA}`);
check('requires login', noAuth.status === 401);
const asHelper = await call('GET', `/helpers/nearby?lat=${lat0}&lng=${lng0}&categoryId=${catA}`, near.token);
check('helpers cannot use the user search', asHelper.status === 403);
const bad = await call('GET', `/helpers/nearby?lat=999&lng=0&categoryId=${catA}`, user.token);
check('invalid coordinates rejected', bad.status === 422);

// tidy up so test helpers don't stay online
await pool.query(`UPDATE helper_profiles SET is_available = false
                   WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [all.map((h) => h.email)]);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
await pool.end();
process.exit(failures ? 1 : 0);