import { deleteAccount } from '../services/account.service.js';
import { isProd } from '../config/env.js';

/** DELETE /api/auth/account */
export async function remove(req, res) {
  const data = await deleteAccount(req.user.id, req.body.password);
  res.clearCookie('refreshToken',
    { httpOnly: true, secure: isProd, sameSite: 'strict', path: '/api/auth' });
  res.json({ success: true, data });
}