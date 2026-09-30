import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/helper.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { setCategoriesSchema, availabilitySchema, nearbySchema } from '../validators/helper.validator.js';
import { listRequestsSchema } from '../validators/request.validator.js';


const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Location searches are cheap but easy to abuse; 60 per minute per IP
const nearbyLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many searches, slow down', errorCode: 'RATE_LIMITED' },
});

const router = Router();

// Users (and admins) search for helpers
router.get('/nearby', nearbyLimiter, authenticate, authorize('USER', 'ADMIN'),
  validate(nearbySchema), wrap(c.nearby));

// Everything below is helper-only
router.use(authenticate, authorize('HELPER'));
router.get('/me', wrap(c.me));
router.put('/categories', validate(setCategoriesSchema), wrap(c.setCategories));
router.patch('/availability', validate(availabilitySchema), wrap(c.setAvailability));
router.get('/jobs', validate(listRequestsSchema), wrap(c.jobs));
router.get('/incoming', wrap(c.incoming));

export default router;