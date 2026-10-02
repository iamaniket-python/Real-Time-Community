import { Router } from 'express';
import * as c from '../controllers/report.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import { createReportSchema } from '../validators/report.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 5 reports per hour per user
const reportLimiter = makeLimiter({
  prefix: 'report',
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'Too many reports, try again later', errorCode: 'RATE_LIMITED' },
});

// Mounted at /api/requests, so this is /api/requests/:id/report
const router = Router();
router.post('/:id/report',
  authenticate, authorize('USER', 'HELPER'), reportLimiter, validate(createReportSchema), wrap(c.create));

export default router;