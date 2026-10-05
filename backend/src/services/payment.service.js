import crypto from 'node:crypto';
import '../config/env.js'; // loads .env before the variables below are read
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const conf = () => ({
  keyId: process.env.RAZORPAY_KEY_ID,
  keySecret: process.env.RAZORPAY_KEY_SECRET,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
});

export const paymentsConfigured = () => !!(conf().keyId && conf().keySecret);
export const publicKeyId = () => conf().keyId;

const eq = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Creates the gateway order and returns its id. The amount is in paise. */
export async function createGatewayOrder({ amountPaise, receipt, notes }) {
  const { keyId, keySecret } = conf();
  if (!keyId || !keySecret) {
    throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not set up yet');
  }
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    logger.error({ status: res.status, body: await res.text().catch(() => '') }, 'gateway order failed');
    throw new AppError(502, 'PAYMENT_GATEWAY_ERROR', 'Could not start the payment, please try again');
  }
  return (await res.json()).id;
}

/** Signature the browser gets after paying: HMAC(order_id|payment_id) with the key secret. */
export function verifyCheckoutSignature(gatewayOrderId, paymentId, signature) {
  const { keySecret } = conf();
  if (!keySecret) return false;
  const expected = crypto.createHmac('sha256', keySecret)
    .update(`${gatewayOrderId}|${paymentId}`).digest('hex');
  return eq(expected, signature);
}

/** Webhook signature: HMAC of the exact raw body with the webhook secret. */
export function verifyWebhookSignature(rawBody, signature) {
  const { webhookSecret } = conf();
  if (!webhookSecret || !signature) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return eq(expected, signature);
}

/**
 * Cancels an unpaid order and puts its stock back. Run inside a transaction.
 * Safe to call twice: it only acts while the order is still PENDING_PAYMENT.
 */
export async function cancelUnpaidOrder(c, orderId, toStatus, note, changedBy = null) {
  const o = (await c.query('SELECT status FROM orders WHERE id = $1 FOR UPDATE', [orderId])).rows[0];
  if (!o || o.status !== 'PENDING_PAYMENT') return false;

  // Lock the products in a fixed order so two cancellations can't deadlock
  await c.query(
    `SELECT id FROM products
      WHERE id IN (SELECT product_id FROM order_items WHERE order_id = $1)
      ORDER BY id FOR UPDATE`, [orderId]);
  await c.query(
    `UPDATE products p SET stock = p.stock + oi.quantity
       FROM order_items oi WHERE oi.order_id = $1 AND p.id = oi.product_id`, [orderId]);
  await c.query('UPDATE orders SET status = $2, updated_at = now() WHERE id = $1', [orderId, toStatus]);
  await c.query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
     VALUES ($1, 'PENDING_PAYMENT', $2, $3, $4)`, [orderId, toStatus, changedBy, note]);
  return true;
}

/**
 * Marks a payment as paid and the order as PLACED. Run inside a transaction.
 * Idempotent: the webhook, the verify call and retries can all arrive in any order.
 */
export async function applyPaid(c, { gatewayOrderId, paymentId, amountPaise }) {
  const pay = (await c.query(
    `SELECT id, order_id, amount_paise, status FROM payments
      WHERE gateway_order_id = $1 FOR UPDATE`, [gatewayOrderId])).rows[0];
  if (!pay) {
    logger.warn({ gatewayOrderId }, 'payment event for an unknown gateway order');
    return { ignored: true };
  }
  if (pay.status === 'PAID') return { already: true, orderId: pay.order_id };
  if (amountPaise != null && Number(amountPaise) !== pay.amount_paise) {
    logger.error({ gatewayOrderId, expected: pay.amount_paise, got: amountPaise }, 'payment amount mismatch');
    return { mismatch: true };
  }

  await c.query(
    `UPDATE payments SET status = 'PAID', gateway_payment_id = $2, paid_at = now() WHERE id = $1`,
    [pay.id, paymentId]);

  const o = (await c.query('SELECT status FROM orders WHERE id = $1 FOR UPDATE', [pay.order_id])).rows[0];
  if (o.status === 'PENDING_PAYMENT') {
    await c.query(`UPDATE orders SET status = 'PLACED', updated_at = now() WHERE id = $1`, [pay.order_id]);
    await c.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, note)
       VALUES ($1, 'PENDING_PAYMENT', 'PLACED', 'Payment received')`, [pay.order_id]);
    return { placed: true, orderId: pay.order_id };
  }

  // Paid after the order was already closed: the stock was released, so a refund is needed
  logger.error({ orderId: pay.order_id, status: o.status, paymentId }, 'PAID AFTER ORDER CLOSED, refund needed');
  await c.query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, note)
     VALUES ($1, $2, $2, 'Payment received after the order was closed: refund needed')`,
    [pay.order_id, o.status]);
  return { placed: false, orderId: pay.order_id };
}