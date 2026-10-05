import { call, check, register, failures } from './flow-lib.js';

const seller = await register('SELLER');
const user = await register('USER');
console.log('registered a SELLER and a USER');

// --- seller can reach seller routes (this proves authorize('SELLER') works)
let r = await call('GET', '/sellers/me', seller.token);
check('seller GET /sellers/me -> 200', r.status === 200, r);
console.log('      profile:', JSON.stringify(r.body?.data ?? r.body).slice(0, 400));

r = await call('GET', '/sellers/me/products', seller.token);
check('seller GET /sellers/me/products -> 200', r.status === 200, r);

r = await call('GET', '/sellers/me/orders', seller.token);
check('seller GET /sellers/me/orders -> 200', r.status === 200, r);

// --- roles are kept apart
r = await call('GET', '/orders', seller.token);
check('seller GET /orders -> 403', r.status === 403, r);

r = await call('GET', '/shops/nearby?lat=24.79&lng=85.0&radiusKm=10', seller.token);
check('seller GET /shops/nearby -> 403', r.status === 403, r);

r = await call('GET', '/sellers/me', user.token);
check('user GET /sellers/me -> 403', r.status === 403, r);

r = await call('GET', '/sellers/me/orders', user.token);
check('user GET /sellers/me/orders -> 403', r.status === 403, r);

r = await call('GET', '/sellers/me', null);
check('no token GET /sellers/me -> 401', r.status === 401, r);

// --- customer routes work for a USER
r = await call('GET', '/orders', user.token);
check('user GET /orders -> 200', r.status === 200, r);
console.log('      orders:', JSON.stringify(r.body?.data ?? r.body).slice(0, 200));

r = await call('GET', '/shops/nearby?lat=24.79&lng=85.0&radiusKm=10', user.token);
check('user GET /shops/nearby -> 200', r.status === 200, r);

r = await call('GET', '/cart', user.token);
check('user GET /cart -> 200', r.status === 200, r);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);