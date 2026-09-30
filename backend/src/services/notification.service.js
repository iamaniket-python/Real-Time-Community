import { query } from '../config/db.js';
import { notFound } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { emitToUser, getIO } from '../sockets/io.js';

export const toDto = (n) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  data: n.data,
  readAt: n.read_at,
  createdAt: n.created_at,
});

/** Call inside a transaction. Returns the row; push it with pushNotifications() AFTER commit. */
export async function createNotification(client, { userId, type, title, body = null, data = {} }) {
  const { rows } = await client.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
    [userId, type, title, body, JSON.stringify(data)]);
  return rows[0];
}

/** Pushes saved notifications live. One count query for the whole batch (no N+1). */
export async function pushNotifications(rows) {
  if (!rows.length || !getIO()) return;
  const userIds = [...new Set(rows.map((n) => n.user_id))];
  const { rows: counts } = await query(
    `SELECT user_id, count(*)::int AS n FROM notifications
      WHERE user_id = ANY($1::uuid[]) AND read_at IS NULL GROUP BY user_id`, [userIds]);
  const byUser = new Map(counts.map((c) => [c.user_id, c.n]));
  for (const n of rows) {
    emitToUser(n.user_id, 'notification:new', {
      notification: toDto(n),
      unreadCount: byUser.get(n.user_id) ?? 0,
    });
  }
}

export async function unreadCount(userId) {
  const { rows } = await query(
    'SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [userId]);
  return rows[0].n;
}

// Keeps every open tab's badge in sync
export async function syncCount(userId) {
  const n = await unreadCount(userId);
  emitToUser(userId, 'notification:count', { unreadCount: n });
  return n;
}

export async function listNotifications(userId, { limit, cursor, unread }) {
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT *, created_at::text AS cursor_ts FROM notifications
      WHERE user_id = $1
        AND ($2::boolean = false OR read_at IS NULL)
        AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::uuid))
      ORDER BY created_at DESC, id DESC
      LIMIT $5`,
    [userId, unread, cur.ts, cur.id, limit + 1]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(toDto),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
    unreadCount: await unreadCount(userId),
  };
}

export async function markRead(userId, id) {
  const { rowCount } = await query(
    'UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2',
    [id, userId]);
  if (!rowCount) throw notFound('NOTIFICATION_NOT_FOUND', 'Notification not found');
  return syncCount(userId);
}

export async function markAllRead(userId) {
  await query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [userId]);
  return syncCount(userId);
}