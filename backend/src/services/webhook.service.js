import crypto from 'node:crypto';
import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { verifyWebhookSignature, applyPaid } from './payment.service.js';

export async function handleWebhook(rawBody, headers) {
  if (!verifyWebhookSignature(rawBody, headers['x-razorpay-signature'])) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Invalid signature');
  }
  let evt;
  try {
    evt = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new AppError(400, 'INVALID_PAYLOAD', 'Invalid payload');
  }
  const eventId = headers['x-razorpay-event-id']
    || crypto.createHash('sha256').update(rawBody).digest('hex');

  // Recording the event and applying it are ONE transaction: a failure rolls both back,
  // so the gateway's retry is processed instead of being skipped as a duplicate.
  await withTransaction(async (c) => {
    const ins = await c.query(
      'INSERT INTO webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id',
      [eventId]);
    if (!ins.rowCount) return; // already processed

    if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
      const p = evt.payload?.payment?.entity;
      if (p?.order_id && p?.id) {
        await applyPaid(c, { gatewayOrderId: p.order_id, paymentId: p.id, amountPaise: p.amount });
      }
    }
  });
}