import { Router } from 'express';
import * as c from '../controllers/helper.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { setCategoriesSchema, availabilitySchema } from '../validators/helper.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const router = Router();
router.use(authenticate, authorize('HELPER'));

router.get('/me', wrap(c.me));
router.put('/categories', validate(setCategoriesSchema), wrap(c.setCategories));
router.patch('/availability', validate(availabilitySchema), wrap(c.setAvailability));

export default router;