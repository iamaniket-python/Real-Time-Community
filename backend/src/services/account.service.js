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

    // 0. Seller: refuse while any order is still in flight (money or goods not settled),
    //    then close the shop and wipe identity data. Products stay (old orders point to them).
    const shopFiles = [];
    const shop = (await c.query(
      'SELECT id FROM seller_profiles WHERE user_id = $1 FOR UPDATE', [userId])).rows[0];
    if (shop) {
      const busy = await c.query(
        `SELECT 1 FROM orders
          WHERE seller_id = $1
            AND status IN ('PENDING_PAYMENT', 'PLACED', 'CONFIRMED', 'READY')
          LIMIT 1`, [shop.id]);
      if (busy.rows[0]) {
        throw conflict('SELLER_HAS_ACTIVE_ORDERS',
          'You still have open orders. Complete or wait for them to finish before deleting your account');
      }

      shopFiles.push(...(await c.query(
        `SELECT p FROM (
           SELECT gst_image_path AS p FROM seller_profiles WHERE id = $1
           UNION ALL SELECT pan_image_path FROM seller_profiles WHERE id = $1
           UNION ALL SELECT aadhaar_image_path FROM seller_profiles WHERE id = $1
           UNION ALL SELECT path FROM shop_images WHERE seller_id = $1
           UNION ALL SELECT image_path FROM products WHERE seller_id = $1
         ) t WHERE p IS NOT NULL`, [shop.id])).rows.map((r) => r.p));

      await c.query(
        `UPDATE seller_profiles
            SET is_open = false, verification = 'SUSPENDED'::verification_status,
                gst_number = NULL, pan_number = NULL, aadhaar_number = NULL,
                gst_image_path = NULL, pan_image_path = NULL, aadhaar_image_path = NULL,
                description = NULL, address = NULL, lat = NULL, lng = NULL
          WHERE id = $1`, [shop.id]);
      await c.query('DELETE FROM shop_images WHERE seller_id = $1', [shop.id]);
      await c.query(
        'UPDATE products SET is_active = false, image_path = NULL WHERE seller_id = $1', [shop.id]);
      // Other customers' carts must not keep items of a closed shop
      await c.query(
        `DELETE FROM cart_items
          WHERE product_id IN (SELECT id FROM products WHERE seller_id = $1)`, [shop.id]);
      await c.query(
        'UPDATE carts SET seller_id = NULL, updated_at = now() WHERE seller_id = $1', [shop.id]);
    }

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

    // 2. Files to remove after commit: request images, chat attachments, shop files
    const files = [
      ...(await c.query(
        'SELECT image_url AS p FROM help_requests WHERE user_id = $1 AND image_url IS NOT NULL', [userId])).rows,
      ...(await c.query(
        'SELECT attachment_url AS p FROM messages WHERE sender_id = $1 AND attachment_url IS NOT NULL', [userId])).rows,
    ].map((r) => r.p).concat(shopFiles);
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