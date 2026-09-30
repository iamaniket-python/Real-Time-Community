import { Router } from 'express';
import * as c from '../controllers/notification.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { listNotificationsSchema, notificationIdSchema } from '../validators/notification.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const router = Router();
router.use(authenticate);

router.get('/', validate(listNotificationsSchema), wrap(c.list));
router.get('/unread-count', wrap(c.count));
router.patch('/read-all', wrap(c.readAll)); // must stay above /:id/read
router.patch('/:id/read', validate(notificationIdSchema), wrap(c.read));

export default router;