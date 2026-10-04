import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import * as account from '../controllers/account.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { deleteAccountSchema } from '../validators/account.validator.js';
import { env } from '../config/env.js';

// AUTH_RATE_LIMIT_MAX attempts per 15 minutes per IP (Redis store, memory fallback)
const authLimiter = makeLimiter({
  prefix: 'auth',
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many attempts, try again later',
    errorCode: 'RATE_LIMITED',
  },
});

// 5 deletion attempts per hour per user
const deleteLimiter = makeLimiter({
  prefix: 'account-delete',
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'Too many attempts, try again later', errorCode: 'RATE_LIMITED' },
});

// Express 4 doesn't catch async errors by itself, so forward them to the error handler
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const router = Router();
router.post('/register', authLimiter, validate(registerSchema), wrap(c.register));
router.post('/login', authLimiter, validate(loginSchema), wrap(c.login));
router.post('/refresh', authLimiter, wrap(c.refresh));
router.post('/logout', wrap(c.logout));
router.get('/me', authenticate, wrap(c.me));
router.delete('/account',
  authenticate, authorize('USER', 'HELPER'), deleteLimiter, validate(deleteAccountSchema), wrap(account.remove));

export default router;