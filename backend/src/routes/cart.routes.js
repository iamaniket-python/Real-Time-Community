import { Router } from 'express';
import * as c from '../controllers/cart.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import { setItemSchema, removeItemSchema } from '../validators/cart.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 120 cart changes per minute per user
const cartLimiter = makeLimiter({
  prefix: 'cart',
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'Too many cart changes, slow down', errorCode: 'RATE_LIMITED' },
});

// Mounted at /api/cart. Customers only.
const router = Router();
router.use(authenticate, authorize('USER'));

router.get('/', wrap(c.get));
router.put('/items', cartLimiter, validate(setItemSchema), wrap(c.setItem));
router.delete('/items/:productId', cartLimiter, validate(removeItemSchema), wrap(c.removeItem));
router.delete('/', cartLimiter, wrap(c.clear));

export default router;