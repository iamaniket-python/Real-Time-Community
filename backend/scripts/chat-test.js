import { io } from 'socket.io-client';
import { pool } from '../src/config/db.js';

const API = 'http://localhost:5000/api';
const WS = 'http://localhost:5000';
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
const sockets = [];
const connect = (token) => new Promise((resolve, reject) => {
  const s = io(WS, { auth: { token }, reconnection: false, forceNew: true });
  sockets.push(s);
  s.on('socket:ready', () => resolve(s));
  s.on('connect_error', (e) => reject(new Error(e.data?.errorCode ?? e.message)));
});
const record = (s) => { const log = []; s.onAny((event, payload) => log.push({ event, payload })); return log; };
const count = (log, event) => log.filter((e) => e.event === event).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = (s, event, ms = 4000) => new Promise((resolve) => {
  const timer = setTimeout(() => { s.off(event, handler); resolve(null); }, ms);
  function handler(p) { clearTimeout(timer); s.off(event, handler); resolve(p); }
  s.on(event, handler);
});

const lat0 = 20 + Math.random() * 30;
const lng0 = 60 + Math.random() * 30;
const catId = (await call('GET', '/categories')).body.data.categories[0].id;

const user = await register('USER');
const stranger = await register('USER');
const helper = await register('HELPER');
await pool.query(`UPDATE helper_profiles SET verification='VERIFIED'
                   WHERE user_id = (SELECT id FROM users WHERE email = $1)`, [helper.email]);
await call('PUT', '/helpers/categories', helper.token, { categoryIds: [catId] });
await call('PATCH', '/helpers/availability', helper.token, { isAvailable: true, lat: lat0 + 0.009, lng: lng0 });

const req = await call('POST', '/requests', user.token,
  { categoryId: catId, title: 'Chat test', description: 'Testing the chat feature.', lat: lat0, lng: lng0 });
const requestId = req.body.data.request.id;

// Chat does not exist until someone accepts
check('no conversation before accept', (await call('GET', '/conversations', user.token)).body.data.items.length === 0);
await call('POST', `/requests/${requestId}/accept`, helper.token);

const tab1 = await connect(user.token);
const tab2 = await connect(user.token);
const hSock = await connect(helper.token);
const logT1 = record(tab1);
const logT2 = record(tab2);
const logH = record(hSock);

// ---- conversations ----
const uList = (await call('GET', '/conversations', user.token)).body.data.items;
const conv = uList[0];
check('user sees the conversation', uList.length === 1 && conv.requestId === requestId && conv.chatOpen === true);
check('other party is the helper (first name only)', conv.otherParty.role === 'HELPER' && conv.otherParty.firstName === 'HELPER');
check('no last message and 0 unread yet', conv.lastMessage === null && conv.unreadCount === 0);
const cid = conv.id;
const hList = (await call('GET', `/conversations?requestId=${requestId}`, helper.token)).body.data.items;
check('helper sees it too (requestId filter)', hList.length === 1 && hList[0].id === cid);

// ---- access control ----
check('stranger cannot send', (await call('POST', '/messages', stranger.token, { conversationId: cid, body: 'hi' })).status === 404);
check('stranger cannot read history', (await call('GET', `/messages/${cid}`, stranger.token)).status === 404);
check('stranger cannot mark read', (await call('POST', `/messages/${cid}/read`, stranger.token)).status === 404);
check('login required', (await call('GET', `/messages/${cid}`)).status === 401);

// ---- sending and live delivery ----
const wH = waitFor(hSock, 'message:new');
const send1 = await call('POST', '/messages', user.token, { conversationId: cid, body: 'Hello, are you close?', clientId: 'client-msg-0001' });
check('send returns 201', send1.status === 201 && send1.body.data.message.body === 'Hello, are you close?', JSON.stringify(send1.body));
const gotH = await wH;
check('helper receives message:new live', gotH?.message?.id === send1.body.data.message.id);
await sleep(500);
check('both sender tabs also got it once', count(logT1, 'message:new') === 1 && count(logT2, 'message:new') === 1);

const replay = await call('POST', '/messages', user.token, { conversationId: cid, body: 'Hello, are you close?', clientId: 'client-msg-0001' });
await sleep(500);
check('same clientId returns the original (no duplicate)',
  replay.status === 200 && replay.body.data.message.id === send1.body.data.message.id);
check('and is not pushed a second time', count(logH, 'message:new') === 1);

// ---- validation ----
const bad = (b) => call('POST', '/messages', user.token, { conversationId: cid, ...b });
check('empty message rejected', (await bad({ body: '   ' })).status === 422);
check('2001 characters rejected', (await bad({ body: 'x'.repeat(2001) })).status === 422);
check('NUL character rejected', (await bad({ body: 'a\u0000b' })).status === 422);
check('unknown field rejected', (await bad({ body: 'hi', role: 'ADMIN' })).status === 422);

// ---- notifications collapse, unread counts ----
await call('POST', '/messages', user.token, { conversationId: cid, body: 'Second message' });
await call('POST', '/messages', user.token, { conversationId: cid, body: 'Third message' });
const hNotes = (await call('GET', '/notifications', helper.token)).body.data.items.filter((n) => n.type === 'NEW_MESSAGE');
check('only one unread NEW_MESSAGE notification per chat', hNotes.length === 1, String(hNotes.length));

const hc = (await call('GET', '/conversations', helper.token)).body.data.items[0];
check('helper unread count is 3', hc.unreadCount === 3, String(hc.unreadCount));
check('last message shown', hc.lastMessage?.body === 'Third message');
check('sender own unread is 0', (await call('GET', '/conversations', user.token)).body.data.items[0].unreadCount === 0);

// ---- history and pagination ----
const p1 = (await call('GET', `/messages/${cid}?limit=2`, helper.token)).body.data;
check('page 1: two newest, newest first', p1.items.length === 2 && p1.items[0].body === 'Third message' && Boolean(p1.nextCursor));
const p2 = (await call('GET', `/messages/${cid}?limit=2&cursor=${p1.nextCursor}`, helper.token)).body.data;
check('page 2: the oldest, no more pages', p2.items.length === 1 && p2.items[0].body === 'Hello, are you close?' && p2.nextCursor === null);
check('unread messages have no readAt yet', p1.items.every((m) => m.readAt === null));

// ---- read receipts ----
const wRead = waitFor(tab1, 'message:read');
const rd = await call('POST', `/messages/${cid}/read`, helper.token);
check('helper marks 3 as read', rd.status === 200 && rd.body.data.marked === 3, JSON.stringify(rd.body));
const ev = await wRead;
check('sender is told live (message:read)', ev?.conversationId === cid && ev.readerId !== undefined && ev.count === 3);
check('helper unread is now 0', (await call('GET', '/conversations', helper.token)).body.data.items[0].unreadCount === 0);
const again = await call('POST', `/messages/${cid}/read`, helper.token);
await sleep(400);
check('marking again marks 0 and sends no new event', again.body.data.marked === 0 && count(logT1, 'message:read') === 1);

const sent = (await call('GET', `/messages/${cid}`, user.token)).body.data.items;
check('sender sees readAt and deliveredAt on their messages', sent.every((m) => m.readAt && m.deliveredAt));
const hAll = (await call('GET', '/notifications', helper.token)).body.data.items.filter((n) => n.type === 'NEW_MESSAGE');
check('the NEW_MESSAGE notification was cleared by reading', hAll.every((n) => n.readAt));

// ---- reply in the other direction ----
const wU = waitFor(tab2, 'message:new');
const reply = await call('POST', '/messages', helper.token, { conversationId: cid, body: 'Yes, 5 minutes away' });
check('helper reply reaches the user tab live', (await wU)?.message?.id === reply.body.data.message.id);
const uNote = (await call('GET', '/notifications', user.token)).body.data.items.find((n) => n.type === 'NEW_MESSAGE');
check('user notification says "from your helper"', uNote?.title === 'New message from your helper');

// ---- closed chat ----
await call('POST', `/requests/${requestId}/cancel`, user.token, {});
const closed = await call('POST', '/messages', user.token, { conversationId: cid, body: 'Anyone there?' });
check('cannot send after the request is cancelled', closed.status === 409 && closed.body.errorCode === 'CHAT_CLOSED');
const hist = await call('GET', `/messages/${cid}`, user.token);
check('history is still readable', hist.status === 200 && hist.body.data.items.length === 4 && hist.body.data.chatOpen === false);

await pool.query(`UPDATE helper_profiles SET is_available = false
                   WHERE user_id = (SELECT id FROM users WHERE email = $1)`, [helper.email]);
sockets.forEach((s) => s.close());
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
await pool.end();
process.exit(failures ? 1 : 0);