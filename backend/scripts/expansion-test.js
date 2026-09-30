import { pool } from '../src/config/db.js';
import { expandSearchRadius } from '../src/jobs/expiry.job.js';

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
async function makeHelper(dLat, catId, lat0, lng0) {
  const h = await register('HELPER');
  await pool.query(`UPDATE helper_profiles SET verification='VERIFIED'
                     WHERE user_id = (SELECT id FROM users WHERE email = $1)`, [h.email]);
  await call('PUT', '/helpers/categories', h.token, { categoryIds: [catId] });
  const r = await call('PATCH', '/helpers/availability', h.token, { isAvailable: true, lat: lat0 + dLat, lng: lng0 });
  if (r.status !== 200) throw new Error(JSON.stringify(r.body));
  return h;
}

const lat0 = 20 + Math.random() * 30;
const lng0 = 60 + Math.random() * 30;
const catId = (await call('GET', '/categories')).body.data.categories[0].id;
const newReq = (user, title) => call('POST', '/requests', user.token,
  { categoryId: catId, title, description: 'Expansion test request.', lat: lat0, lng: lng0 });
const ageExpansion = (id) => pool.query(
  `UPDATE help_requests SET radius_expanded_at = now() - interval '5 minutes' WHERE id = $1`, [id]);

// ---------- radius expansion ----------
const userA = await register('USER');
const farHelper = await makeHelper(0.072, catId, lat0, lng0); // about 8 km away
const reqA = await newReq(userA, 'Expand me');
const idA = reqA.body.data.request.id;

check('starts with the 5 km radius', reqA.body.data.request.searchRadiusKm === 5);
check('helper 8 km away sees nothing yet',
  !((await call('GET', '/helpers/incoming', farHelper.token)).body.data.items).some((i) => i.id === idA));
const early = await call('POST', `/requests/${idA}/accept`, farHelper.token);
check('accept is OUT_OF_RANGE before expansion', early.status === 409 && early.body.errorCode === 'OUT_OF_RANGE');

let widened = await expandSearchRadius();
check('nothing expands before the interval passes', !widened.some((w) => w.id === idA));

await ageExpansion(idA);
widened = await expandSearchRadius();
const w1 = widened.find((w) => w.id === idA);
check('radius grows to 10 km after the interval', w1 && Number(w1.search_radius_km) === 10, JSON.stringify(w1));
widened = await expandSearchRadius();
check('does not expand twice in a row', !widened.some((w) => w.id === idA));

check('helper now sees the request',
  ((await call('GET', '/helpers/incoming', farHelper.token)).body.data.items).some((i) => i.id === idA));

await pool.query('UPDATE help_requests SET search_radius_km = 24 WHERE id = $1', [idA]);
await ageExpansion(idA);
widened = await expandSearchRadius();
const w2 = widened.find((w) => w.id === idA);
check('radius is capped at the max (25 km)', w2 && Number(w2.search_radius_km) === 25, JSON.stringify(w2));
await ageExpansion(idA);
widened = await expandSearchRadius();
check('no expansion once at the max', !widened.some((w) => w.id === idA));

check('helper can accept after expansion', (await call('POST', `/requests/${idA}/accept`, farHelper.token)).status === 200);
await ageExpansion(idA);
widened = await expandSearchRadius();
check('accepted requests are never expanded', !widened.some((w) => w.id === idA));
await call('POST', `/requests/${idA}/cancel`, userA.token, {});

// ---------- helper job list ----------
const userB = await register('USER');
const userC = await register('USER');
const jobHelper = await makeHelper(0.009, catId, lat0, lng0);

async function runJob(user, title, finish) {
  const r = await newReq(user, title);
  const id = r.body.data.request.id;
  await call('POST', `/requests/${id}/accept`, jobHelper.token);
  if (finish) {
    for (const status of ['ARRIVING', 'IN_PROGRESS', 'COMPLETED']) {
      await call('PATCH', `/requests/${id}/status`, jobHelper.token, { status });
    }
  }
  return id;
}
const jobB = await runJob(userB, 'Job one', true);
const jobC = await runJob(userC, 'Job two', false); // left ACCEPTED

const all = await call('GET', '/helpers/jobs', jobHelper.token);
const ids = (all.body.data?.items ?? []).map((i) => i.id);
check('job list has both jobs, newest first', ids.length === 2 && ids[0] === jobC && ids[1] === jobB, ids.join());

const p1 = await call('GET', '/helpers/jobs?limit=1', jobHelper.token);
check('page 1 has one job and a cursor', p1.body.data.items.length === 1 && Boolean(p1.body.data.nextCursor));
const p2 = await call('GET', `/helpers/jobs?limit=1&cursor=${p1.body.data.nextCursor}`, jobHelper.token);
check('page 2 has the other job and no more cursor',
  p2.body.data.items.length === 1 && p2.body.data.items[0].id === jobB && p2.body.data.nextCursor === null);

const done = await call('GET', '/helpers/jobs?status=COMPLETED', jobHelper.token);
check('status filter works', done.body.data.items.length === 1 && done.body.data.items[0].id === jobB);
check('helper sees full details of own job', all.body.data.items[0].lat !== undefined);
check('users cannot list helper jobs', (await call('GET', '/helpers/jobs', userB.token)).status === 403);
check('bad cursor is rejected', (await call('GET', '/helpers/jobs?cursor=abc', jobHelper.token)).status === 400);

await call('PATCH', `/requests/${jobC}/status`, jobHelper.token, { status: 'ARRIVING' });
await call('POST', `/requests/${jobC}/cancel`, userC.token, {});
await pool.query(`UPDATE helper_profiles SET is_available = false
                   WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1))`, [[farHelper.email, jobHelper.email]]);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
await pool.end();
process.exit(failures ? 1 : 0);