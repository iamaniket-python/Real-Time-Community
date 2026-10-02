import 'dotenv/config';
import { pool } from '../src/config/db.js';

const API = process.env.BASE_URL ?? 'http://localhost:5000/api';
const ORIGIN = new URL(API).origin;
let failures = 0;

async function send(method, path, token, body, form) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, body: json };
}
const call = (m, p, t, b) => send(m, p, t, b);

function upload(path, token, bytes, name, mime, fields = {}) {
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: mime }), name);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return send('POST', path, token, null, fd);
}

function check(label, ok, detail) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log('      ', JSON.stringify(detail).slice(0, 300));
  }
}

async function register(role) {
  const email = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const r = await call('POST', '/auth/register', null, { name: `${role} Flow`, email, password: 'Str0ngPass123', role });
  if (r.status !== 201) throw new Error('register failed: ' + JSON.stringify(r.body).slice(0, 200));
  return { email, token: r.body.data.accessToken };
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

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

const pending = await call('GET', '/admin/helpers?status=PENDING&limit=50', admin);
check('new helper is in PENDING list', pending.body?.data?.items?.some((h) => h.id === hp), pending.body);
const ver = await call('POST', `/admin/helpers/${hp}/verify`, admin, { reason: 'flow test' });
check('admin verifies helper', ver.status === 200 && ver.body.data.verificationStatus === 'VERIFIED', ver.body);
const again = await call('POST', `/admin/helpers/${hp}/verify`, admin, {});
check('verify twice is 409', again.status === 409, again.body);

const categoryId = (await call('GET', '/categories')).body.data.categories[0].id;
await call('PUT', '/helpers/categories', helper.token, { categoryIds: [categoryId] });
const av = await call('PATCH', '/helpers/availability', helper.token, { isAvailable: true, lat: 25.61, lng: 85.14 });
check('verified helper goes available', av.status === 200, av.body);

const created = await call('POST', '/requests', user.token,
  { categoryId, title: 'Flow A', description: 'Flow test request for uploads.', lat: 25.6093, lng: 85.1376 });
check('create request', created.status === 201, created.body);
const reqId = created.body.data.request.id;
check('helper accepts', (await call('POST', `/requests/${reqId}/accept`, helper.token)).status === 200);

const up = await upload(`/requests/${reqId}/image`, user.token, PNG, 'p.png', 'image/png');
check('owner uploads request image', up.status === 201, up.body);
const u = await call('GET', `/requests/${reqId}/image-url`, user.token);
const signed = u.body?.data?.imageUrl;
check('owner gets signed URL', u.status === 200 && Boolean(signed), u.body);
if (signed) {
  const img = await fetch(ORIGIN + signed);
  check('signed URL serves image/png', img.status === 200 && img.headers.get('content-type') === 'image/png', img.status);
  const bad = await fetch(ORIGIN + signed.replace(/sig=[0-9a-f]{4}/, 'sig=0000'));
  check('tampered signature is 404', bad.status === 404, bad.status);
}
check('accepted helper sees image', (await call('GET', `/requests/${reqId}/image-url`, helper.token)).status === 200);
check('outsider gets 404', (await call('GET', `/requests/${reqId}/image-url`, other.token)).status === 404);
const fake = await upload(`/requests/${reqId}/image`, user.token, Buffer.from('not an image'), 'e.png', 'image/png');
check('fake PNG is 415', fake.status === 415, fake.body);

const convs = await call('GET', `/conversations?requestId=${reqId}`, user.token);
const convId = convs.body?.data?.items?.[0]?.id;
check('conversation exists', Boolean(convId), convs.body);
if (convId) {
  const cid = `flow-${Date.now()}`;
  const cap = await upload(`/messages/${convId}/attachments`, user.token, PNG, 'a.png', 'image/png',
    { caption: 'Here is the leak', clientId: cid + '-a' });
  check('chat image with caption', cap.status === 201, cap.body);
  const only = await upload(`/messages/${convId}/attachments`, helper.token, PNG, 'b.png', 'image/png', { clientId: cid + '-b' });
  check('image-only chat message', only.status === 201, only.body);
  const rep = await upload(`/messages/${convId}/attachments`, helper.token, PNG, 'b.png', 'image/png', { clientId: cid + '-b' });
  check('same clientId replays 200', rep.status === 200, rep.body);
  const hist = await call('GET', `/messages/${convId}`, user.token);
  const att = hist.body?.data?.items?.find((m) => m.attachment);
  check('history has signed attachment URL', Boolean(att?.attachment?.url), hist.body);
  const out = await upload(`/messages/${convId}/attachments`, other.token, PNG, 'c.png', 'image/png');
  check('outsider cannot attach (404)', out.status === 404, out.body);
}

const del = await call('DELETE', `/requests/${reqId}/image`, user.token);
check('owner removes image', del.status === 200 && del.body.data.removed === true, del.body);
check('image-url 404 after delete', (await call('GET', `/requests/${reqId}/image-url`, user.token)).status === 404);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nflow-a: all checks passed');
await pool.end();
process.exit(failures ? 1 : 0);