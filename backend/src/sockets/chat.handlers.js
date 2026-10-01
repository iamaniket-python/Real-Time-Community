import { z } from 'zod';
import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { rooms } from './rooms.js';
import { emitToUsers } from './io.js';
import {
  getConversation,
  isChatOpen,
  sendMessage,
  markConversationRead,
  markDelivered,
} from '../services/message.service.js';

const id = z.string().uuid();
const conversationSchema = z.object({ conversationId: id }).strict();
// Same rules as the REST validator (message.validator.js)
const sendSchema = z.object({
  conversationId: id,
  body: z.string().trim().min(1).max(2000).refine((s) => !s.includes('\u0000'), 'Invalid character'),
  clientId: z.string().trim().min(8).max(64).optional(),
}).strict();
const deliveredSchema = z.object({
  conversationId: id,
  messageIds: z.array(id).min(1).max(100),
}).strict();

const TYPING_INTERVAL_MS = 2_000;   // one typing:start per conversation per 2 s
const TYPING_MIN_GAP_MS = 250;      // socket-wide guard against event floods
const PEER_CACHE_MS = 30_000;       // how long a participant lookup is reused for typing

// Same limit as POST /messages (30/min per user). In memory: single instance until Phase 8 (Redis).
const SEND_LIMIT = 30;
const SEND_WINDOW_MS = 60_000;
const sendWindows = new Map(); // userId -> { count, resetAt }

function allowSend(userId) {
  const now = Date.now();
  let w = sendWindows.get(userId);
  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + SEND_WINDOW_MS };
    sendWindows.set(userId, w);
  }
  if (w.count >= SEND_LIMIT) return false;
  w.count += 1;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, w] of sendWindows) if (w.resetAt <= now) sendWindows.delete(userId);
}, SEND_WINDOW_MS).unref();

export function registerChatHandlers(socket) {
  const { user } = socket.data;

  const peers = new Map();       // conversationId -> { otherId, open, until }
  const lastTyping = new Map();  // conversationId -> timestamp of last typing:start we forwarded
  let lastAnyTyping = 0;

  /**
   * Registers one acked event. A handler returns an object; if it contains `errorCode`
   * the ack is { ok: false, ... }, otherwise { ok: true, ... }.
   */
  const on = (event, schema, fn) => {
    socket.on(event, async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const parsed = schema.safeParse(payload);
        if (!parsed.success) return reply({ ok: false, errorCode: 'VALIDATION_ERROR' });
        const out = await fn(parsed.data);
        reply('errorCode' in out ? { ok: false, ...out } : { ok: true, ...out });
      } catch (err) {
        if (err instanceof AppError) {
          return reply({ ok: false, errorCode: err.errorCode, message: err.message });
        }
        logger.error({ err, event, userId: user.id }, 'chat handler failed');
        reply({ ok: false, errorCode: 'INTERNAL_ERROR' });
      }
    });
  };

  async function resolvePeer(conversationId) {
    const hit = peers.get(conversationId);
    if (hit && hit.until > Date.now()) return hit;
    const cv = await getConversation(pool, conversationId, user.id); // throws 404 for non-participants
    const entry = {
      otherId: cv.user_id === user.id ? cv.helper_user_id : cv.user_id,
      open: isChatOpen(cv.status),
      until: Date.now() + PEER_CACHE_MS,
    };
    peers.set(conversationId, entry);
    return entry;
  }

  on('conversation:join', conversationSchema, async ({ conversationId }) => {
    const cv = await getConversation(pool, conversationId, user.id);
    await socket.join(rooms.conversation(conversationId));
    return { conversationId, chatOpen: isChatOpen(cv.status) };
  });

  on('conversation:leave', conversationSchema, async ({ conversationId }) => {
    await socket.leave(rooms.conversation(conversationId));
    return { conversationId };
  });

  on('message:send', sendSchema, async ({ conversationId, body, clientId }) => {
    if (!allowSend(user.id)) {
      return { errorCode: 'RATE_LIMITED', message: 'Too many messages, slow down' };
    }
    // Emits message:new to both participants itself (after commit)
    const { message, created } = await sendMessage(user.id, { conversationId, body, clientId });

    // Sending a message ends "typing" on the other side
    const peer = peers.get(conversationId);
    if (peer && lastTyping.delete(conversationId)) {
      emitToUsers([peer.otherId], 'typing:stop', { conversationId, userId: user.id });
    }
    return { message, created };
  });

  on('message:delivered', deliveredSchema, async ({ conversationId, messageIds }) =>
    markDelivered(user.id, conversationId, messageIds));

  on('message:read', conversationSchema, async ({ conversationId }) =>
    markConversationRead(user.id, conversationId));

  on('typing:start', conversationSchema, async ({ conversationId }) => {
    const now = Date.now();
    if (now - lastAnyTyping < TYPING_MIN_GAP_MS) return { ignored: true };
    if (now - (lastTyping.get(conversationId) ?? 0) < TYPING_INTERVAL_MS) return { ignored: true };
    lastAnyTyping = now;
    lastTyping.set(conversationId, now); // set before any await so parallel calls can't slip through

    let peer;
    try {
      peer = await resolvePeer(conversationId);
    } catch (err) {
      lastTyping.delete(conversationId); // don't let junk ids accumulate
      throw err;
    }
    if (!peer.open) {
      lastTyping.delete(conversationId);
      return { errorCode: 'CHAT_CLOSED' };
    }
    emitToUsers([peer.otherId], 'typing:start', { conversationId, userId: user.id });
    return {};
  });

  on('typing:stop', conversationSchema, async ({ conversationId }) => {
    const peer = peers.get(conversationId); // no DB lookup: we only stop what we started
    if (!peer || !peer.open) return { ignored: true };
    lastTyping.delete(conversationId);
    emitToUsers([peer.otherId], 'typing:stop', { conversationId, userId: user.id });
    return {};
  });
}