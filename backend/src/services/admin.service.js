import { query, withTransaction } from '../config/db.js';
import { conflict, notFound, forbidden } from '../utils/AppError.js';
import { getIO, closeOffers, emitRequestEvent } from '../sockets/io.js';
import { rooms } from '../sockets/rooms.js';
import { pushNotifications } from './notification.service.js';
import { logger } from '../utils/logger.js';

const HELPER_TRANSITIONS = {
  verify:  { from: ['PENDING', 'REJECTED', 'SUSPENDED'], to: 'VERIFIED' },
  reject:  { from: ['PENDING'], to: 'REJECTED' },
  suspend: { from: ['VERIFIED'], to: 'SUSPENDED' },
};

const audit = (c, adminId, action, targetType, targetId, metadata) =>
  c.query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4::text, $5::jsonb)`,
    [adminId, action, targetType, String(targetId), JSON.stringify(metadata ?? {})]);

/** Helpers filtered by verification status (default: waiting for review). */
export async function listHelpers({ status, limit }) {
  const { rows } = await query(
    `SELECT hp.id, hp.verification::text AS verification, hp.is_available,
            u.id AS user_id, u.name, u.email, u.status AS account_status, u.created_at
       FROM helper_profiles hp JOIN users u ON u.id = hp.user_id
      WHERE hp.verification = $1::verification_status
      ORDER BY u.created_at ASC, hp.id ASC
      LIMIT $2`,
    [status, limit]);
  return {
    items: rows.map((h) => ({
      id: h.id,
      userId: h.user_id,
      name: h.name,
      email: h.email,
      verificationStatus: h.verification,
      isAvailable: h.is_available,
      accountStatus: h.account_status,
      createdAt: h.created_at,
    })),
  };
}

/** action = 'verify' | 'reject' | 'suspend'. helperId is the helper PROFILE id. */
export async function changeHelperStatus(adminId, helperId, action, reason) {
  const rule = HELPER_TRANSITIONS[action];
  return withTransaction(async (c) => {
    const { rows } = await c.query(
      'SELECT id, verification::text AS verification FROM helper_profiles WHERE id = $1 FOR UPDATE',
      [helperId]);
    const h = rows[0];
    if (!h) throw notFound('HELPER_NOT_FOUND', 'Helper not found');
    if (!rule.from.includes(h.verification)) {
      throw conflict('INVALID_STATE_TRANSITION',
        `Cannot ${action} a helper whose status is ${h.verification}`);
    }

    const stillVerified = rule.to === 'VERIFIED';
    await c.query(
      `UPDATE helper_profiles
          SET verification = $2::verification_status,
              is_available = is_available AND $3::boolean
        WHERE id = $1`,
      [helperId, rule.to, stillVerified]);

    await audit(c, adminId, `HELPER_${action.toUpperCase()}`, 'helper_profile', helperId,
      { from: h.verification, to: rule.to, reason: reason ?? null });
    return { helperId, verificationStatus: rule.to };
  });
}

/** Cancels every active request the user is part of. Runs inside the block transaction. */
async function cancelActiveRequests(c, userId) {
  const { rows } = await c.query(
    `SELECT r.id, r.status::text AS status, r.user_id, hp.user_id AS helper_user_id
       FROM help_requests r
       LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
      WHERE r.status IN ('PENDING','SEARCHING','ACCEPTED','ARRIVING','IN_PROGRESS')
        AND (r.user_id = $1 OR hp.user_id = $1)
      FOR UPDATE OF r`,
    [userId]);
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    // History first, while the old status is still in the row
    await c.query(
      `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by, note)
       SELECT id, status, 'CANCELLED', NULL, 'Cancelled: user blocked by admin'
         FROM help_requests WHERE id = ANY($1::uuid[])`,
      [ids]);
    await c.query(
      `UPDATE help_requests SET status = 'CANCELLED' WHERE id = ANY($1::uuid[])`, [ids]);
  }
  return rows;
}

/** After commit, best effort: tell everyone affected. Never throws. */
async function announceCancellations(blockedUserId, cancelled) {
  for (const r of cancelled) {
    try {
      const otherId = r.user_id === blockedUserId ? r.helper_user_id : r.user_id;
      const userIds = [r.user_id, r.helper_user_id].filter((id) => id && id !== blockedUserId);

      emitRequestEvent({ userIds, requestId: r.id }, 'request:cancelled',
        { requestId: r.id, reason: 'USER_BLOCKED' });
      if (r.status === 'SEARCHING') closeOffers(r.id, 'CANCELLED');

      if (otherId) {
        const { rows } = await query(
          `INSERT INTO notifications (user_id, type, title, data)
           VALUES ($1, 'REQUEST_CANCELLED', 'Your request was cancelled', $2::jsonb)
           RETURNING *`,
          [otherId, JSON.stringify({ requestId: r.id, reason: 'USER_BLOCKED' })]);
        await pushNotifications(rows);
      }
    } catch (err) {
      logger.error({ err, requestId: r.id }, 'could not announce cancellation');
    }
  }
}

/** action = 'block' | 'unblock'. */
export async function changeUserStatus(adminId, userId, action, reason) {
  if (userId === adminId) throw forbidden('CANNOT_MODIFY_SELF', 'You cannot change your own account status');

  const result = await withTransaction(async (c) => {
    const { rows } = await c.query(
      'SELECT id, role, status FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const u = rows[0];
    if (!u) throw notFound('USER_NOT_FOUND', 'User not found');
    if (u.role === 'ADMIN') throw forbidden('CANNOT_MODIFY_ADMIN', 'Admin accounts cannot be changed here');

    let next;
    if (action === 'block') {
      if (u.status === 'BLOCKED') throw conflict('ALREADY_BLOCKED', 'User is already blocked');
      if (u.status === 'DELETED') throw conflict('INVALID_STATE_TRANSITION', 'Account is deleted');
      next = 'BLOCKED';
    } else {
      if (!['BLOCKED', 'SUSPENDED'].includes(u.status)) {
        throw conflict('INVALID_STATE_TRANSITION', `Cannot unblock an account whose status is ${u.status}`);
      }
      next = 'ACTIVE';
    }

    await c.query('UPDATE users SET status = $2 WHERE id = $1', [userId, next]);

    let cancelled = [];
    if (action === 'block') {
      await c.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
      await c.query('UPDATE helper_profiles SET is_available = false WHERE user_id = $1', [userId]);
      cancelled = await cancelActiveRequests(c, userId);
    }

    await audit(c, adminId, `USER_${action.toUpperCase()}`, 'user', userId, {
      from: u.status,
      to: next,
      reason: reason ?? null,
      cancelledRequestIds: cancelled.map((r) => r.id),
    });
    return { userId, status: next, cancelled };
  });

  if (action === 'block') {
    await announceCancellations(userId, result.cancelled);
    try { // drop every live socket of that user
      getIO()?.in(rooms.user(userId)).disconnectSockets(true);
    } catch (err) {
      logger.error({ err }, 'could not disconnect blocked user');
    }
  }
  return { userId: result.userId, status: result.status, cancelledRequests: result.cancelled.length };
}