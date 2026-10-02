import 'dotenv/config';

const BASE = process.env.BASE_URL ?? 'http://localhost:5000/api';
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, json };
}

function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) { failed += 1; if (detail !== undefined) console.log('      ', JSON.stringify(detail).slice(0, 300)); }
}

// Finds an access token wherever the login response keeps it
const findToken = (o) => {
  if (!o || typeof o !== 'object') return null;
  if (typeof o.accessToken === 'string') return o.accessToken;
  for (const v of Object.values(o)) { const t = findToken(v); if (t) return t; }
  return null;
};

const health = await call('GET', '/health');
check('health ok, redis up', health.status === 200 && health.json?.redis === 'up', health.json);

const login = await call('POST', '/auth/login',
  { body: { email: process.env.ADMIN_SEED_EMAIL, password: process.env.ADMIN_SEED_PASSWORD } });
const token = findToken(login.json);
check('admin login', login.status === 200 && Boolean(token), { status: login.status, errorCode: login.json?.errorCode });
if (!token) process.exit(1);

const noAuth = await call('GET', '/admin/stats');
check('admin route without token is 401', noAuth.status === 401, noAuth.status);

const stats = await call('GET', '/admin/stats', { token });
check('stats', stats.status === 200 && stats.json?.data?.usersByRole, stats.json);

const helpers = await call('GET', '/admin/helpers?status=PENDING', { token });
check('list pending helpers', helpers.status === 200 && Array.isArray(helpers.json?.data?.items), helpers.json);

const badStatus = await call('GET', '/admin/helpers?status=NOPE', { token });
check('invalid status is 422', badStatus.status === 422, badStatus.status);

const reports = await call('GET', '/admin/reports', { token });
check('list reports', reports.status === 200 && Array.isArray(reports.json?.data?.items), reports.json);

const active = await call('GET', '/admin/requests/active', { token });
check('active requests', active.status === 200 && Array.isArray(active.json?.data?.items), active.json);

const name = `Smoke ${Date.now()}`;
const created = await call('POST', '/admin/categories', { token, body: { name } });
check('create category', created.status === 201 && created.json?.data?.category?.id, created.json);
const catId = created.json?.data?.category?.id;

const dup = await call('POST', '/admin/categories', { token, body: { name } });
check('duplicate category is 409', dup.status === 409, dup.json);

if (catId) {
  const off = await call('PATCH', `/admin/categories/${catId}`, { token, body: { isActive: false } });
  check('deactivate category', off.status === 200 && off.json?.data?.category?.isActive === false, off.json);
  const empty = await call('PATCH', `/admin/categories/${catId}`, { token, body: {} });
  check('empty category update is 422', empty.status === 422, empty.status);
}

const audit = await call('GET', '/admin/audit-log?limit=10', { token });
check('audit log lists CATEGORY_CREATE',
  audit.status === 200 && audit.json?.data?.items?.some((a) => a.action === 'CATEGORY_CREATE'), audit.json);

const self = await call('GET', '/auth/me', { token });
const myId = self.json?.data?.user?.id ?? self.json?.data?.id;
if (myId) {
  const blockSelf = await call('POST', `/admin/users/${myId}/block`, { token, body: {} });
  check('admin cannot block self (403)', blockSelf.status === 403, blockSelf.json);
}

const fakeFile = await call('GET', '/uploads/00000000-0000-0000-0000-000000000000.jpg?exp=1&sig=bad');
check('upload with bad signature is 404', fakeFile.status === 404, fakeFile.status);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);