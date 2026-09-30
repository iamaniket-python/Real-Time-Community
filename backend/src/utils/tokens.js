import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);

// Refresh tokens use a different secret and a unique jti, so no two are ever identical
export const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  });

export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

// The database stores only this hash, never the raw token
export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');