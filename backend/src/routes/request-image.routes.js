import { Router } from 'express';
import * as c from '../controllers/request-image.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import { requestIdSchema } from '../validators/request-image.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 10 uploads per minute per user
const uploadLimiter = makeLimiter({
  prefix: 'req-image',
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'You are uploading too fast', errorCode: 'RATE_LIMITED' },
});

// Mounted at /api/requests, so these are /api/requests/:id/image and /:id/image-url
const router = Router();

router.post('/:id/image',
  authenticate, authorize('USER'), uploadLimiter, uploadImage, validate(requestIdSchema), wrap(c.upload));
router.delete('/:id/image',
  authenticate, authorize('USER'), validate(requestIdSchema), wrap(c.remove));
router.get('/:id/image-url',
  authenticate, authorize('USER', 'HELPER', 'ADMIN'), validate(requestIdSchema), wrap(c.url));

export default router;