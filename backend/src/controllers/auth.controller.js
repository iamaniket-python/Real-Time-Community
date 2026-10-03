import * as auth from '../services/auth.service.js';
import { env, isProd } from '../config/env.js';

const COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,                        // JavaScript in the browser can't read it (XSS protection)
  secure: isProd,                        // HTTPS only in production
  sameSite: isProd ? 'none' : 'strict',  // Vercel and Render are different sites, so production needs 'none'
  path: '/api/auth',                     // only sent to auth endpoints
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

const userAgent = (req) => req.headers['user-agent'];

// The refresh token goes in the cookie only, never in the JSON body
const send = (res, status, { user, accessToken, refreshToken }) => {
  res.cookie(COOKIE, refreshToken, cookieOptions);
  res.status(status).json({ success: true, data: { user, accessToken } });
};

export const register = async (req, res) =>
  send(res, 201, await auth.register(req.body, userAgent(req)));

export const login = async (req, res) =>
  send(res, 200, await auth.login(req.body, userAgent(req)));

export const refresh = async (req, res) =>
  send(res, 200, await auth.refresh(req.cookies[COOKIE], userAgent(req)));

export const logout = async (req, res) => {
  await auth.logout(req.cookies[COOKIE]);
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ success: true, data: null });
};

export const me = async (req, res) =>
  res.json({ success: true, data: { user: await auth.me(req.user.id) } });