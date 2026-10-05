import express, { Router } from 'express';
import { handleWebhook } from '../services/webhook.service.js';
import { logger } from '../utils/logger.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Mounted at /api/webhooks BEFORE express.json(): the signature is checked against the raw bytes
const router = Router();
router.post('/razorpay', express.raw({ type: '*/*', limit: '1mb' }), wrap(async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    logger.error('webhook body was already parsed: mount /api/webhooks before express.json()');
    return res.status(500).json({ success: false, message: 'Webhook misconfigured', errorCode: 'WEBHOOK_CONFIG' });
  }
  await handleWebhook(req.body, req.headers);
  res.json({ success: true, data: null });
}));

export default router;