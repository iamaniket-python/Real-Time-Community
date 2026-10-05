import { query, withTransaction } from '../config/db.js';
import { cancelUnpaidOrder } from '../services/payment.service.js';
import { logger } from '../utils/logger.js';

const EVERY_MS = 60_000;

/** Cancels unpaid orders whose window ended and gives their stock back. Safe on several servers. */
export async function expireUnpaidOrders() {
  // One minute of grace so a payment that is just completing is not cancelled under it
  const { rows } = await query(
    `SELECT id FROM orders
      WHERE status = 'PENDING_PAYMENT' AND expires_at < now() - interval '1 minute'
      ORDER BY expires_at LIMIT 100`);
  for (const r of rows) {
    try {
      await withTransaction((c) => cancelUnpaidOrder(c, r.id, 'EXPIRED', 'Payment window expired'));
    } catch (err) {
      logger.error({ err, orderId: r.id }, 'could not expire order');
    }
  }
  return rows.length;
}

export function startOrderExpiryJob() {
  const timer = setInterval(() => {
    expireUnpaidOrders().catch((err) => logger.error({ err }, 'order expiry run failed'));
  }, EVERY_MS);
  timer.unref();
  return timer;
}