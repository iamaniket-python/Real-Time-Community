import 'dotenv/config';

export const API = process.env.BASE_URL ?? 'http://localhost:5000/api';
export const ORIGIN = new URL(API).origin;
export let failures = 0;

export async function send(method, path, token, body, form) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, {
    method, headers, body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, body: json };
}
export const call = (m, p, t, b) => send(m, p, t, b);

export function upload(path, token, bytes, name, mime, fields = {}) {
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: mime }), name);
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return send('POST', path, token, null, fd);
}

export function check(label, ok, detail) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log('      ', JSON.stringify(detail).slice(0, 300));
  }
}

export async function register(role) {
  const email = `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const r = await call('POST', '/auth/register', null,
    { name: `${role} Flow`, email, password: 'Str0ngPass123', role });
  if (r.status !== 201) throw new Error('register failed: ' + JSON.stringify(r.body).slice(0, 200));
  return { email, token: r.body.data.accessToken };
}

export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');