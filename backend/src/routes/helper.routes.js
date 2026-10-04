import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/helper.controller.js';
import * as b from '../controllers/helper-business.controller.js';
import * as d from '../controllers/helper-documents.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { setCategoriesSchema, availabilitySchema, nearbySchema } from '../validators/helper.validator.js';
import { businessSchema } from '../validators/helper-business.validator.js';
import { listRequestsSchema } from '../validators/request.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const nearbyLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many searches, slow down', errorCode: 'RATE_LIMITED' },
});
const docLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many uploads, try again later', errorCode: 'RATE_LIMITED' },
});

const router = Router();

router.get('/nearby', nearbyLimiter, authenticate, authorize('USER', 'ADMIN'),
  validate(nearbySchema), wrap(c.nearby));

// Everything below is helper-only
router.use(authenticate, authorize('HELPER'));
router.get('/me', wrap(c.me));
router.get('/me/business', wrap(b.get));
router.put('/me/business', validate(businessSchema), wrap(b.save));
router.get('/me/documents', wrap(d.list));
router.post('/me/documents/:type', docLimiter, uploadImage, wrap(d.upload));
router.put('/categories', validate(setCategoriesSchema), wrap(c.setCategories));
router.patch('/availability', validate(availabilitySchema), wrap(c.setAvailability));
router.get('/jobs', validate(listRequestsSchema), wrap(c.jobs));
router.get('/incoming', wrap(c.incoming));

export default router;