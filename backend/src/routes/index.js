import { Router } from 'express';
import { query } from '../config/db.js';
import { pingRedis } from '../config/redis.js';
import auth from './auth.routes.js';
import admin from './admin.routes.js';
import requests from './request.routes.js';
import requestHelper from './request-helper.routes.js';
import requestImages from './request-image.routes.js';
import { requestRatingRouter, helperRatingRouter } from './rating.routes.js';
import reports from './report.routes.js';
import categories from './category.routes.js';
import helpers from './helper.routes.js';
import messages, { conversationRouter } from './message.routes.js';
import uploads from './upload.routes.js';
import * as notificationModule from './notification.routes.js';

const notifications = notificationModule.default ?? notificationModule.notificationRouter;
if (!notifications) {
  throw new Error('notification.routes.js has no default export or notificationRouter export');
}

const router = Router();

router.get('/health', async (_req, res) => {
  const redisOk = await pingRedis();
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', redis: redisOk ? 'up' : 'down' });
  } catch {
    res.status(503).json({ status: 'degraded', redis: redisOk ? 'up' : 'down' });
  }
});

router.use('/auth', auth);
router.use('/admin', admin);
router.use('/categories', categories);
router.use('/notifications', notifications);
router.use('/requests', requestImages);       // /:id/image, /:id/image-url
router.use('/requests', requestRatingRouter); // /:id/rating
router.use('/requests', reports);             // /:id/report
router.use('/requests', requestHelper);       // /:id/helper
router.use('/requests', requests);
router.use('/helpers', helperRatingRouter);   // /:id/ratings (before `helpers`)
router.use('/helpers', helpers);
router.use('/messages', messages);
router.use('/conversations', conversationRouter);
router.use('/uploads', uploads); // signed URLs, no Bearer token

export default router;