import { Router } from 'express';
import * as c from '../controllers/request-helper.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Mounted at /api/requests. Only GET /:id/helper matches here, everything else falls through.
const router = Router();
router.get('/:id/helper', authenticate, authorize('USER', 'ADMIN'), wrap(c.get));

export default router;