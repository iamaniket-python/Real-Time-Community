import { readFileSync } from 'node:fs';
import { call, check, failures } from './flow-lib.js';

const { admin, user, helper, other, hp, reqId } = JSON.parse(
  readFileSync(new URL('./flow-state.json', import.meta.url), 'utf8'));

const early = await call('POST', `/requests/${reqId}/rating`, user.token, { score: 5 });
check('rating before COMPLETED is 409', early.status === 409 && early.body?.errorCode === 'REQUEST_NOT_COMPLETED', early.body);
for (const status of ['ARRIVING', 'IN_PROGRESS', 'COMPLETED']) {
  const r = await call('PATCH', `/requests/${reqId}/status`, helper.token, { status });
  check(`status ${status}`, r.status === 200, r.body);
}

const rp = `/requests/${reqId}/rating`;
check('score 6 is 422', (await call('POST', rp, user.token, { score: 6 })).status === 422);
check('outsider cannot rate (404)', (await call('POST', rp, other.token, { score: 5 })).status === 404);
const rate = await call('POST', rp, user.token, { score: 4, comment: 'Quick and friendly' });
check('owner rates helper', rate.status === 201 && rate.body.data.helper.ratingCount === 1 && rate.body.data.helper.ratingAvg === 4, rate.body);
const twice = await call('POST', rp, user.token, { score: 5 });
check('rating twice is ALREADY_RATED', twice.body?.errorCode === 'ALREADY_RATED', twice.body);
const list = await call('GET', `/helpers/${hp}/ratings`, other.token);
check('helper ratings list', list.status === 200 && list.body.data.items[0]?.comment === 'Quick and friendly', list.body);
const notes = await call('GET', '/notifications?unread=true', helper.token);
check('helper got RATING_RECEIVED', JSON.stringify(notes.body).includes('RATING_RECEIVED'), notes.body);

const bp = `/requests/${reqId}/report`;
const rep = await call('POST', bp, helper.token, { reason: 'NO_SHOW', details: 'Flow test report' });
check('helper reports requester', rep.status === 201 && Boolean(rep.body?.data?.report?.id), rep.body);
check('report twice is ALREADY_REPORTED', (await call('POST', bp, helper.token, { reason: 'OTHER' })).body?.errorCode === 'ALREADY_REPORTED');
check('outsider cannot report (404)', (await call('POST', bp, other.token, { reason: 'OTHER' })).status === 404);
check('bad reason is 422', (await call('POST', bp, user.token, { reason: 'BAD' })).status === 422);
const reports = await call('GET', '/admin/reports?limit=50', admin);
check('admin sees the report', reports.body?.data?.items?.some((r) => r.id === rep.body?.data?.report?.id), reports.body);
const probe = await call('PATCH', `/admin/reports/${rep.body?.data?.report?.id}`, admin, { status: 'NOT_A_STATUS' });
check('invalid report status is 409 with allowed list', probe.status === 409, probe.body);
console.log('report status values:', probe.body?.message);

console.log(failures ? `\n${failures} FAILED` : '\nflow-b1 passed');
process.exit(failures ? 1 : 0);