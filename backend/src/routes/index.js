import { Router } from 'express';
import { query } from '../config/db.js';
import { pingRedis } from '../config/redis.js';
import auth from './auth.routes.js';
import admin from './admin.routes.js';
import requests from './request.routes.js';
import requestImages from './request-image.routes.js';
import { requestRatingRouter, helperRatingRouter } from './rating.routes.js';
import reports from './report.routes.js';
import categories from './category.routes.js';
import helpers from './helper.routes.js';
import messages, { conversationRouter } from './message.routes.js';
import uploads from './upload.routes.js';

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
router.use('/requests', requestImages);      
router.use('/requests', requestRatingRouter);
router.use('/requests', reports);             
router.use('/requests', requests);
router.use('/helpers', helperRatingRouter); 
router.use('/helpers', helpers);
router.use('/messages', messages);
router.use('/conversations', conversationRouter);
router.use('/uploads', uploads);

export default router;