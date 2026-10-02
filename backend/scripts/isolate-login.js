const BASE = process.env.BASE_URL ?? 'http://localhost:5000/api';

async function probe(name, method, path, body) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    console.log(name, '->', res.status);
  } catch (e) {
    console.log(name, '-> FAILED:', e.cause?.code ?? e.message);
  }
}

await probe('health (no limiter)        ', 'GET', '/health');
await probe('auth/me (no limiter, 401)  ', 'GET', '/auth/me');
await probe('login, empty body (limiter)', 'POST', '/auth/login', {});
await probe('login, fake user (limiter+db)', 'POST', '/auth/login', { email: 'nobody@example.com', password: 'wrong-password-123' });