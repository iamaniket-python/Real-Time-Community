import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/request-image.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { requestIdSchema } from '../validators/request-image.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 10 uploads per minute per user (in-memory now; Redis store in Phase 8)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
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