import { Router } from 'express';
import * as c from '../controllers/request.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createRequestSchema, listRequestsSchema, requestIdSchema,
} from '../validators/request.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const router = Router();
router.use(authenticate);

router.post('/', authorize('USER'), validate(createRequestSchema), wrap(c.create));
router.get('/', authorize('USER'), validate(listRequestsSchema), wrap(c.list));
router.get('/:id', validate(requestIdSchema), wrap(c.getOne)); // access checked in the service
router.post('/:id/accept', authorize('HELPER'), validate(requestIdSchema), wrap(c.accept));

export default router;