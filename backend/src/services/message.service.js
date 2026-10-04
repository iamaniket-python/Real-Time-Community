import { pool, query, withTransaction } from '../config/db.js';
import { conflict, notFound } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { emitToUsers } from '../sockets/io.js';
import { pushNotifications, syncCount } from './notification.service.js';
import { signedUrl, storeImage, deleteStored } from './upload.service.js';
import { logger } from '../utils/logger.js';

// ADMIN_CHAT is the pseudo-status of an admin<->helper conversation (no request): always open
const ACTIVE = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS', 'ADMIN_CHAT'];

/** True while messages can still be sent for a request with this status. */
export const isChatOpen = (status) => ACTIVE.includes(status);

const toMessage = (m) => ({
  id: m.id,
  conversationId: m.conversation_id,
  senderId: m.sender_id,
  body: m.body,
  // The database keeps a plain path; the client gets a short-lived signed URL
  attachment: m.attachment_url
    ? { url: signedUrl(m.attachment_url), type: m.attachment_type }
    : null,
  deliveredAt: m.delivered_at,
  readAt: m.read_at ?? null,
  createdAt: m.created_at,
  clientId: m.client_id,
});

/** Works with the pool or a transaction client. Non-participants get the same 404 as a missing chat. */
export async function getConversation(db, conversationId, userId) {
  const { rows } = await db.query(
    `SELECT cv.id, cv.request_id, cv.user_id, cv.helper_user_id,
            COALESCE(r.status::text, 'ADMIN_CHAT') AS status
       FROM conversations cv LEFT JOIN help_requests r ON r.id = cv.request_id
      WHERE cv.id = $1 AND (cv.user_id = $2 OR cv.helper_user_id = $2)`,
    [conversationId, userId]);
  if (!rows[0]) throw notFound('CONVERSATION_NOT_FOUND', 'Conversation not found');
  return rows[0];
}

export async function listConversations(userId, { requestId }) {
  // One query: last message via LATERAL, unread count via a correlated subquery (no N+1)
  const { rows } = await query(
    `SELECT cv.id, cv.request_id, COALESCE(r.title, 'Admin support') AS title,
            COALESCE(r.status::text, 'ADMIN_CHAT') AS status,
            ou.id AS other_id, split_part(ou.name, ' ', 1) AS other_name, ou.role AS other_role,
            lm.id AS last_id, lm.body AS last_body, lm.sender_id AS last_sender,
            (lm.attachment_url IS NOT NULL) AS last_has_attachment, lm.created_at AS last_at,
            (SELECT count(*)::int FROM messages m
              WHERE m.conversation_id = cv.id AND m.sender_id <> $1
                AND NOT EXISTS (SELECT 1 FROM message_reads mr
                                 WHERE mr.message_id = m.id AND mr.reader_id = $1)) AS unread
       FROM conversations cv
       LEFT JOIN help_requests r ON r.id = cv.request_id
       JOIN users ou ON ou.id = CASE WHEN cv.user_id = $1 THEN cv.helper_user_id ELSE cv.user_id END
       LEFT JOIN LATERAL (
         SELECT id, body, sender_id, attachment_url, created_at FROM messages
          WHERE conversation_id = cv.id ORDER BY created_at DESC, id DESC LIMIT 1) lm ON true
      WHERE (cv.user_id = $1 OR cv.helper_user_id = $1)
        AND ($2::uuid IS NULL OR cv.request_id = $2::uuid)
      ORDER BY COALESCE(lm.created_at, cv.created_at) DESC
      LIMIT 50`,
    [userId, requestId ?? null]);

  return {
    items: rows.map((c) => ({
      id: c.id,
      requestId: c.request_id,
      requestTitle: c.title,
      requestStatus: c.status,
      chatOpen: ACTIVE.includes(c.status),
      otherParty: { id: c.other_id, firstName: c.other_name, role: c.other_role },
      lastMessage: c.last_id
        ? { id: c.last_id, body: c.last_body, hasAttachment: c.last_has_attachment,
            senderId: c.last_sender, createdAt: c.last_at }
        : null,
      unreadCount: c.unread,
    })),
  };
}

export async function getMessages(userId, conversationId, { limit, cursor }) {
  const cv = await getConversation(pool, conversationId, userId);
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };

  // readAt = when the RECIPIENT of each message read it (one join, no N+1)
  const { rows } = await query(
    `SELECT m.*, m.created_at::text AS cursor_ts, mr.read_at
       FROM messages m
       LEFT JOIN message_reads mr ON mr.message_id = m.id
        AND mr.reader_id = CASE WHEN m.sender_id = $2 THEN $3::uuid ELSE $4::uuid END
      WHERE m.conversation_id = $1
        AND ($5::timestamptz IS NULL OR (m.created_at, m.id) < ($5::timestamptz, $6::uuid))
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $7`,
    // $2 = participant A (requester), $3 = helper, $4 = requester: the recipient is the other side
    [conversationId, cv.user_id, cv.helper_user_id, cv.user_id, cur.ts, cur.id, limit + 1]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(toMessage), // newest first; the UI reverses for display
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
    chatOpen: ACTIVE.includes(cv.status),
  };
}

/** Shared by text and attachment messages. attachment = { path, type } or null. */
async function insertMessage(userId, { conversationId, body, clientId, attachment }) {
  const result = await withTransaction(async (c) => {
    const cv = await getConversation(c, conversationId, userId);
    if (!ACTIVE.includes(cv.status)) throw conflict('CHAT_CLOSED', 'This chat is closed');
    const recipientId = cv.user_id === userId ? cv.helper_user_id : cv.user_id;

    const ins = await c.query(
      `INSERT INTO messages (conversation_id, sender_id, body, client_id, attachment_url, attachment_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (conversation_id, sender_id, client_id) DO NOTHING
       RETURNING *`,
      [conversationId, userId, body, clientId ?? null,
        attachment?.path ?? null, attachment?.type ?? null]);

    if (!ins.rowCount) { // same clientId sent again: return the original
      const prev = await c.query(
        'SELECT * FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND client_id = $3',
        [conversationId, userId, clientId]);
      return { message: prev.rows[0], created: false, recipientId };
    }

    // At most one unread NEW_MESSAGE notification per conversation
    const title = !cv.request_id
      ? (cv.user_id === userId ? 'New message from admin' : 'New message from your helper')
      : (cv.user_id === userId ? 'New message about your job' : 'New message from your helper');
    const note = (await c.query(
      `INSERT INTO notifications (user_id, type, title, data)
       SELECT $1::uuid, 'NEW_MESSAGE', $2::text, $3::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM notifications
                           WHERE user_id = $1::uuid AND type = 'NEW_MESSAGE' AND read_at IS NULL
                             AND data->>'conversationId' = $4::text)
       RETURNING *`,
      [recipientId, title, JSON.stringify({ conversationId, requestId: cv.request_id }), conversationId]
    )).rows[0] ?? null;

    return { message: ins.rows[0], created: true, recipientId, note };
  });

  const message = toMessage(result.message);
  if (result.created) {
    // After commit, best effort. Both participants' tabs (including the sender's other tabs) get it.
    try {
      emitToUsers([userId, result.recipientId], 'message:new', { message });
      if (result.note) await pushNotifications([result.note]);
    } catch (err) {
      logger.error({ err }, 'message push failed');
    }
  }
  return { message, created: result.created };
}

export const sendMessage = (userId, { conversationId, body, clientId }) =>
  insertMessage(userId, { conversationId, body, clientId, attachment: null });

/**
 * Image message. file = { buffer, detected: { mime, ext } } from the uploadImage middleware.
 * The caption may be empty. Nothing is written to disk unless the sender is a participant
 * and the chat is open.
 */
export async function sendAttachment(userId, { conversationId, caption, clientId, file }) {
  const cv = await getConversation(pool, conversationId, userId);
  if (!ACTIVE.includes(cv.status)) throw conflict('CHAT_CLOSED', 'This chat is closed');

  if (clientId) { // replay: return the original without storing the file again
    const prev = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND client_id = $3',
      [conversationId, userId, clientId]);
    if (prev.rows[0]) return { message: toMessage(prev.rows[0]), created: false };
  }

  const stored = await storeImage(file.buffer, file.detected.ext);
  try {
    const out = await insertMessage(userId, {
      conversationId,
      body: caption ?? '',
      clientId,
      attachment: { path: stored.path, type: stored.mime },
    });
    if (!out.created) await deleteStored(stored.path); // lost a race with the same clientId
    return out;
  } catch (err) {
    await deleteStored(stored.path); // no orphan files when the insert fails
    throw err;
  }
}

/**
 * The recipient confirms their client received these messages.
 * Only messages sent by the OTHER participant that are not yet delivered are updated.
 */
export async function markDelivered(userId, conversationId, messageIds) {
  const cv = await getConversation(pool, conversationId, userId);
  const otherId = cv.user_id === userId ? cv.helper_user_id : cv.user_id;

  const { rows } = await query(
    `UPDATE messages SET delivered_at = now()
      WHERE conversation_id = $1 AND sender_id <> $2
        AND id = ANY($3::uuid[]) AND delivered_at IS NULL
      RETURNING id, delivered_at`,
    [conversationId, userId, messageIds]);

  if (rows.length > 0) {
    emitToUsers([otherId], 'message:delivered', {
      conversationId,
      messageIds: rows.map((r) => r.id),
      deliveredAt: rows[0].delivered_at,
    });
  }
  return { delivered: rows.length };
}

export async function markConversationRead(userId, conversationId) {
  const cv = await getConversation(pool, conversationId, userId);
  const otherId = cv.user_id === userId ? cv.helper_user_id : cv.user_id;

  // One statement: mark everything unread as read and as delivered
  const { rows } = await query(
    `WITH incoming AS (
       SELECT m.id FROM messages m
        WHERE m.conversation_id = $1 AND m.sender_id <> $2
          AND NOT EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.reader_id = $2)
     ), delivered AS (
       UPDATE messages SET delivered_at = COALESCE(delivered_at, now())
        WHERE id IN (SELECT id FROM incoming)
     ), ins AS (
       INSERT INTO message_reads (message_id, reader_id)
       SELECT id, $2 FROM incoming ON CONFLICT DO NOTHING RETURNING message_id
     )
     SELECT count(*)::int AS n FROM ins`,
    [conversationId, userId]);
  const marked = rows[0].n;

  if (marked > 0) {
    emitToUsers([userId, otherId], 'message:read',
      { conversationId, readerId: userId, count: marked, readAt: new Date().toISOString() });
  }
  await query(
    `UPDATE notifications SET read_at = now()
      WHERE user_id = $1 AND type = 'NEW_MESSAGE' AND read_at IS NULL
        AND data->>'conversationId' = $2`, [userId, conversationId]);
  await syncCount(userId);
  return { marked };
}