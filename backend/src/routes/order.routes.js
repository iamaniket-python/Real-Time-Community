import { Router } from 'express';
import * as c from '../controllers/checkout.controller.js';
import * as o from '../controllers/order.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import { checkoutSchema, orderIdSchema, verifyPaymentSchema } from '../validators/checkout.validator.js';
import { listOrdersSchema } from '../validators/order.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 10 checkouts per minute per user
const checkoutLimiter = makeLimiter({
  prefix: 'checkout',
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'Too many attempts, slow down', errorCode: 'RATE_LIMITED' },
});

// Mounted at /api/orders. Customers only.
const router = Router();
router.use(authenticate, authorize('USER'));

router.get('/', validate(listOrdersSchema), wrap(o.list));
router.post('/checkout', checkoutLimiter, validate(checkoutSchema), wrap(c.checkout));
router.get('/:id', validate(orderIdSchema), wrap(o.detail));
router.get('/:id/payment', validate(orderIdSchema), wrap(c.payment));
router.post('/:id/verify', checkoutLimiter, validate(verifyPaymentSchema), wrap(c.verify));

export default router;