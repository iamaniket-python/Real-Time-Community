import { Router } from 'express';
import * as c from '../controllers/rating.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createRatingSchema, listRatingsSchema } from '../validators/rating.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Mounted at /api/requests
export const requestRatingRouter = Router();
requestRatingRouter.post('/:id/rating',
  authenticate, authorize('USER'), validate(createRatingSchema), wrap(c.create));

// Mounted at /api/helpers (:id is the helper PROFILE id)
export const helperRatingRouter = Router();
helperRatingRouter.get('/:id/ratings',
  authenticate, authorize('USER', 'HELPER', 'ADMIN'), validate(listRatingsSchema), wrap(c.list));