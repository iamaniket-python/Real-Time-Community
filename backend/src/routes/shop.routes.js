import { Router } from 'express';
import * as p from '../controllers/product.controller.js';
import * as c from '../controllers/shop.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import { shopProductsSchema } from '../validators/product.validator.js';
import { nearbyShopsSchema, shopIdSchema } from '../validators/shop.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 60 searches per minute per user
const nearbyLimiter = makeLimiter({
  prefix: 'shop-nearby',
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'Too many searches, slow down', errorCode: 'RATE_LIMITED' },
});

// Mounted at /api/shops. For logged-in customers (and admins).
const router = Router();
router.use(authenticate, authorize('USER', 'ADMIN'));

router.get('/nearby', nearbyLimiter, validate(nearbyShopsSchema), wrap(c.nearby));
router.get('/:id', validate(shopIdSchema), wrap(c.one));
router.get('/:id/products', validate(shopProductsSchema), wrap(p.shopProducts));

export default router;