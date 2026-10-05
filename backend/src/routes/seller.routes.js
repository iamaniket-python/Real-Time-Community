import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/seller.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { sellerProfileSchema, sellerOpenSchema } from '../validators/seller.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many uploads, try again later', errorCode: 'RATE_LIMITED' },
});

// Mounted at /api/sellers. Everything here is for the logged-in seller.
const router = Router();
router.use(authenticate, authorize('SELLER'));

router.get('/me', wrap(c.me));
router.put('/me', validate(sellerProfileSchema), wrap(c.save));
router.patch('/me/open', validate(sellerOpenSchema), wrap(c.open));
router.get('/me/documents', wrap(c.documents));
router.post('/me/documents/:type', uploadLimiter, uploadImage, wrap(c.uploadDoc));
router.get('/me/gallery', wrap(c.gallery));
router.post('/me/gallery', uploadLimiter, uploadImage, wrap(c.addImage));
router.delete('/me/gallery/:imageId', wrap(c.removeImage));

export default router;