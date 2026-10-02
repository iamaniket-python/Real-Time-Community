import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { forbidden, unauthorized, conflict } from '../utils/AppError.js';
import { getIO, closeOffers, emitRequestEvent } from '../sockets/io.js';
import { rooms } from '../sockets/rooms.js';
import { pushNotifications } from './notification.service.js';
import { deleteStored } from './upload.service.js';
import { logger } from '../utils/logger.js';

export async function deleteAccount(userId, password) {
  const { rows } = await query(
    'SELECT id, role, status, password_hash FROM users WHERE id = $1', [userId]);
  const u = rows[0];
  if (!u || u.status !== 'ACTIVE') throw unauthorized('ACCOUNT_INACTIVE', 'Account is not active');
  if (u.role === 'ADMIN') throw forbidden('CANNOT_DELETE_ADMIN', 'Admin accounts cannot be deleted here');
  if (!(await bcrypt.compare(password, u.password_hash))) {
    throw unauthorized('INVALID_CREDENTIALS', 'Incorrect password');
  }
  const unusableHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

  const result = await withTransaction(async (c) => {
    const lock = await c.query('SELECT status FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (lock.rows[0].status !== 'ACTIVE') throw conflict('ALREADY_DELETED', 'Account is not active');

    // 1. Cancel active requests (as requester or accepted helper)
    const active = (await c.query(
      `SELECT r.id, r.status::text AS status, r.user_id, hp.user_id AS helper_user_id
         FROM help_requests r
         LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
        WHERE r.status IN ('PENDING','SEARCHING','ACCEPTED','ARRIVING','IN_PROGRESS')
          AND (r.user_id = $1 OR hp.user_id = $1)
        FOR UPDATE OF r`, [userId])).rows;
    if (active.length) {
      const ids = active.map((r) => r.id);
      await c.query(
        `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by, note)
         SELECT id, status, 'CANCELLED', $2, 'Cancelled: account deleted'
           FROM help_requests WHERE id = ANY($1::uuid[])`, [ids, userId]);
      await c.query(`UPDATE help_requests SET status = 'CANCELLED' WHERE id = ANY($1::uuid[])`, [ids]);
    }

    // 2. Files to remove after commit: request images and chat attachments
    const files = [
      ...(await c.query(
        'SELECT image_url AS p FROM help_requests WHERE user_id = $1 AND image_url IS NOT NULL', [userId])).rows,
      ...(await c.query(
        'SELECT attachment_url AS p FROM messages WHERE sender_id = $1 AND attachment_url IS NOT NULL', [userId])).rows,
    ].map((r) => r.p);
    await c.query('UPDATE help_requests SET image_url = NULL WHERE user_id = $1', [userId]);
    await c.query(
      `UPDATE messages SET body = '[deleted]', attachment_url = NULL, attachment_type = NULL
        WHERE sender_id = $1`, [userId]);

    // 3. Personal data, sessions, notifications
    await c.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await c.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
    await c.query(
      `UPDATE helper_profiles SET is_available = false, bio = NULL,
              current_lat = NULL, current_lng = NULL WHERE user_id = $1`, [userId]);
    await c.query(
      `UPDATE users SET status = 'DELETED', name = 'Deleted user', email = $2,
              phone = NULL, avatar_url = NULL, password_hash = $3 WHERE id = $1`,
      [userId, `deleted-${userId}@deleted.invalid`, unusableHash]);

    return { active, files };
  });

  // After commit, best effort
  await Promise.allSettled(result.files.map((f) => deleteStored(f)));
  for (const r of result.active) {
    try {
      const otherId = r.user_id === userId ? r.helper_user_id : r.user_id;
      const userIds = [r.user_id, r.helper_user_id].filter((id) => id && id !== userId);
      emitRequestEvent({ userIds, requestId: r.id }, 'request:cancelled',
        { requestId: r.id, reason: 'USER_DELETED' });
      if (r.status === 'SEARCHING') closeOffers(r.id, 'CANCELLED');
      if (otherId) {
        const n = await query(
          `INSERT INTO notifications (user_id, type, title, data)
           VALUES ($1, 'REQUEST_CANCELLED', 'Your request was cancelled', $2::jsonb) RETURNING *`,
          [otherId, JSON.stringify({ requestId: r.id, reason: 'USER_DELETED' })]);
        await pushNotifications(n.rows);
      }
    } catch (err) {
      logger.error({ err, requestId: r.id }, 'could not announce cancellation');
    }
  }
  try {
    getIO()?.in(rooms.user(userId)).disconnectSockets(true);
  } catch (err) {
    logger.error({ err }, 'could not disconnect deleted user');
  }
  return { deleted: true, cancelledRequests: result.active.length };
}