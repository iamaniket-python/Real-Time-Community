import { verifyAccessToken } from '../utils/tokens.js';
import { unauthorized, forbidden } from '../utils/AppError.js';
import { query } from '../config/db.js';

/**
 * Reads the Bearer token, then re-checks role and status in the database.
 * The role is never trusted from the frontend or from the token alone,
 * so suspending or blocking a user takes effect immediately.
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw unauthorized();

    let payload;
    try {
      payload = verifyAccessToken(header.slice(7));
    } catch {
      throw unauthorized('TOKEN_EXPIRED', 'Session expired');
    }

    const { rows } = await query(
      'SELECT id, role, status FROM users WHERE id = $1',
      [payload.sub],
    );
    const user = rows[0];
    if (!user || user.status !== 'ACTIVE') {
      throw unauthorized('ACCOUNT_INACTIVE', 'Account is not active');
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

// Usage: router.get('/admin/users', authenticate, authorize('ADMIN'), handler)
export const authorize =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(forbidden('INSUFFICIENT_ROLE', 'You do not have permission'));