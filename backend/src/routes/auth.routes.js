import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { env } from '../config/env.js';

// 20 attempts per 15 minutes per IP (moves to a Redis store in Phase 8)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  limit: env.AUTH_RATE_LIMIT_MAX,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, try again later',
    errorCode: 'RATE_LIMITED',
  },
});

// Express 4 doesn't catch async errors by itself, so forward them to the error handler
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const router = Router();
router.post('/register', authLimiter, validate(registerSchema), wrap(c.register));
router.post('/login', authLimiter, validate(loginSchema), wrap(c.login));
router.post('/refresh', authLimiter, wrap(c.refresh));
router.post('/logout', wrap(c.logout));
router.get('/me', authenticate, wrap(c.me));

export default router;