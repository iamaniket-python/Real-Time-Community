import { Router } from 'express';
import { query } from '../config/db.js';
import auth from './auth.routes.js';
import requests from './request.routes.js';
import categories from './category.routes.js';
import helpers from './helper.routes.js';
import messages, { conversationRouter } from './message.routes.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});



router.use('/auth', auth);
router.use('/categories', categories);
router.use('/requests', requests);
router.use('/helpers', helpers);
router.use('/messages', messages);
router.use('/conversations', conversationRouter);

export default router;