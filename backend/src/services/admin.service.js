import { query, withTransaction } from '../config/db.js';
import { conflict, notFound, forbidden } from '../utils/AppError.js';
import { getIO } from '../sockets/io.js';
import { rooms } from '../sockets/rooms.js';
import { logger } from '../utils/logger.js';

const HELPER_TRANSITIONS = {
  verify:  { from: ['PENDING', 'REJECTED', 'SUSPENDED'], to: 'VERIFIED' },
  reject:  { from: ['PENDING'], to: 'REJECTED' },
  suspend: { from: ['VERIFIED'], to: 'SUSPENDED' },
};

const audit = (c, adminId, action, targetType, targetId, details) =>
  c.query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [adminId, action, targetType, targetId, JSON.stringify(details ?? {})]);

/** Helpers filtered by verification status (default: waiting for review). */
export async function listHelpers({ status, limit }) {
  const { rows } = await query(
    `SELECT hp.id, hp.verification_status, hp.is_available,
            u.id AS user_id, u.name, u.email, u.status AS account_status, u.created_at
       FROM helper_profiles hp JOIN users u ON u.id = hp.user_id
      WHERE hp.verification_status = $1
      ORDER BY u.created_at ASC, hp.id ASC
      LIMIT $2`,
    [status, limit]);
  return {
    items: rows.map((h) => ({
      id: h.id,
      userId: h.user_id,
      name: h.name,
      email: h.email,
      verificationStatus: h.verification_status,
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
      'SELECT id, verification_status FROM helper_profiles WHERE id = $1 FOR UPDATE', [helperId]);
    const h = rows[0];
    if (!h) throw notFound('HELPER_NOT_FOUND', 'Helper not found');
    if (!rule.from.includes(h.verification_status)) {
      throw conflict('INVALID_STATE_TRANSITION',
        `Cannot ${action} a helper whose status is ${h.verification_status}`);
    }

    const stillVerified = rule.to === 'VERIFIED';
    await c.query(
      `UPDATE helper_profiles
          SET verification_status = $2, is_available = is_available AND $3::boolean
        WHERE id = $1`,
      [helperId, rule.to, stillVerified]);

    await audit(c, adminId, `HELPER_${action.toUpperCase()}`, 'helper_profile', helperId,
      { from: h.verification_status, to: rule.to, reason: reason ?? null });
    return { helperId, verificationStatus: rule.to };
  });
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

    if (action === 'block') {
      await c.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
      await c.query('UPDATE helper_profiles SET is_available = false WHERE user_id = $1', [userId]);
    }

    await audit(c, adminId, `USER_${action.toUpperCase()}`, 'user', userId,
      { from: u.status, to: next, reason: reason ?? null });
    return { userId, status: next };
  });

  if (action === 'block') {
    try { // after commit, best effort: drop every live socket of that user
      getIO()?.in(rooms.user(userId)).disconnectSockets(true);
    } catch (err) {
      logger.error({ err }, 'could not disconnect blocked user');
    }
  }
  return result;
}