import { readFileSync } from 'node:fs';
import { call, check, upload, PNG, ORIGIN, failures } from './flow-lib.js';

const { user, helper, other, reqId } = JSON.parse(
  readFileSync(new URL('./flow-state.json', import.meta.url), 'utf8'));

const up = await upload(`/requests/${reqId}/image`, user.token, PNG, 'p.png', 'image/png');
check('owner uploads request image', up.status === 201, up.body);
const u = await call('GET', `/requests/${reqId}/image-url`, user.token);
const signed = u.body?.data?.imageUrl;
check('owner gets signed URL', u.status === 200 && Boolean(signed), u.body);
if (signed) {
  const img = await fetch(ORIGIN + signed);
  check('URL serves image/png', img.status === 200 && img.headers.get('content-type') === 'image/png', img.status);
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
  const path = `/messages/${convId}/attachments`;
  const cap = await upload(path, user.token, PNG, 'a.png', 'image/png', { caption: 'Here is the leak', clientId: cid + '-a' });
  check('chat image with caption', cap.status === 201, cap.body);
  const only = await upload(path, helper.token, PNG, 'b.png', 'image/png', { clientId: cid + '-b' });
  check('image-only chat message', only.status === 201, only.body);
  const rep = await upload(path, helper.token, PNG, 'b.png', 'image/png', { clientId: cid + '-b' });
  check('same clientId replays 200', rep.status === 200, rep.body);
  const hist = await call('GET', `/messages/${convId}`, user.token);
  check('history has signed attachment URL', Boolean(hist.body?.data?.items?.find((m) => m.attachment)?.attachment?.url), hist.body);
  const out = await upload(path, other.token, PNG, 'c.png', 'image/png');
  check('outsider cannot attach (404)', out.status === 404, out.body);
}

const del = await call('DELETE', `/requests/${reqId}/image`, user.token);
check('owner removes image', del.status === 200 && del.body.data.removed === true, del.body);
check('image-url 404 after delete', (await call('GET', `/requests/${reqId}/image-url`, user.token)).status === 404);
console.log(failures ? `\n${failures} FAILED` : '\nflow-a2 passed');
process.exit(failures ? 1 : 0);