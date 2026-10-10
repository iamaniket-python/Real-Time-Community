import bcrypt from 'bcrypt';
import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { conflict, unauthorized } from '../utils/AppError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/tokens.js';

// Only return safe fields, never password_hash
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  avatarUrl: u.avatar_url,
});

// Compared against when the email doesn't exist, so response time
// doesn't reveal which emails are registered
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 12);

async function issueTokens(client, user, userAgent) {
  const refreshToken = signRefreshToken(user.id);
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, now() + make_interval(days => $3), $4)`,
    [user.id, hashToken(refreshToken), env.REFRESH_TOKEN_TTL_DAYS, userAgent?.slice(0, 250)],
  );
  return { accessToken: signAccessToken(user), refreshToken };
}

export async function register({ name, email, phone, password, role }, userAgent) {
  const hash = await bcrypt.hash(password, 12);

  return withTransaction(async (c) => {
    const exists = await c.query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
    if (exists.rowCount) throw conflict('EMAIL_TAKEN', 'Email is already registered');

    const { rows } = await c.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, phone ?? null, hash, role],
    );
    const user = rows[0];

    // Helpers, sellers and delivery partners get an (unverified) profile immediately
    if (role === 'HELPER') {
      await c.query('INSERT INTO helper_profiles (user_id) VALUES ($1)', [user.id]);
    }
    if (role === 'SELLER') {
      await c.query('INSERT INTO seller_profiles (user_id) VALUES ($1)', [user.id]);
    }
    if (role === 'DELIVERY') {
      await c.query('INSERT INTO delivery_partners (user_id) VALUES ($1)', [user.id]);
    }
    return { user: publicUser(user), ...(await issueTokens(c, user, userAgent)) };
  });
}

export async function login({ email, password }, userAgent) {
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const user = rows[0];

  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  if (user.status !== 'ACTIVE') throw unauthorized('ACCOUNT_INACTIVE', 'Account is not active');

  return withTransaction(async (c) => ({
    user: publicUser(user),
    ...(await issueTokens(c, user, userAgent)),
  }));
}

/**
 * Refresh tokens rotate: each one works once. If a token that was already
 * used shows up again, it was probably stolen, so every session of that
 * user is revoked.
 */
export async function refresh(token, userAgent) {
  if (!token) throw unauthorized('NO_REFRESH_TOKEN', 'Please log in');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthorized('INVALID_REFRESH_TOKEN', 'Please log in again');
  }

  const result = await withTransaction(async (c) => {
    const { rows } = await c.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE',
      [hashToken(token)],
    );
    const row = rows[0];
    if (!row || row.expires_at < new Date()) {
      throw unauthorized('INVALID_REFRESH_TOKEN', 'Please log in again');
    }

    if (row.revoked_at) {
      await c.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [row.user_id],
      );
      return { reused: true }; // returned (not thrown) so the revocation commits
    }

    await c.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);

    const u = (await c.query('SELECT * FROM users WHERE id = $1', [payload.sub])).rows[0];
    if (!u || u.status !== 'ACTIVE') throw unauthorized('ACCOUNT_INACTIVE', 'Account is not active');

    return { user: publicUser(u), ...(await issueTokens(c, u, userAgent)) };
  });

  if (result.reused) {
    throw unauthorized('REFRESH_TOKEN_REUSED', 'Session invalidated, please log in again');
  }
  return result;
}

export async function logout(token) {
  if (!token) return;
  await query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [hashToken(token)],
  );
}

export async function me(userId) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  return publicUser(rows[0]);
}