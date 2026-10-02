import 'dotenv/config';

const BASE = process.env.BASE_URL ?? 'http://localhost:5000/api';
const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;
console.log('ADMIN_SEED_EMAIL set:', Boolean(email), '| ADMIN_SEED_PASSWORD set:', Boolean(password));

try {
  const res = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => null);
  console.log('admin login ->', res.status, json?.errorCode ?? (json?.success ? 'success' : ''));
} catch (e) {
  console.log('admin login -> FAILED:', e.cause?.code ?? e.message);
}

try {
  const h = await fetch(BASE + '/health');
  console.log('health after login ->', h.status, '(server is still alive)');
} catch (e) {
  console.log('health after login -> FAILED:', e.cause?.code ?? e.message, '(server died)');
}