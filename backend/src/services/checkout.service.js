import { query, withTransaction } from '../config/db.js';
import { AppError, conflict, notFound } from '../utils/AppError.js';
import {
  createGatewayOrder, cancelUnpaidOrder, applyPaid, verifyCheckoutSignature,
  paymentsConfigured, publicKeyId,
} from './payment.service.js';

const PAY_WINDOW_MINUTES = 15;
const MAX_TOTAL_PAISE = 2_000_000_000; // the integer column limit
const MIN_TOTAL_PAISE = 100;           // the gateway minimum (one rupee)

/** The details the browser needs to open the payment window. Owner only. */
export async function paymentFor(userId, orderId) {
  const { rows } = await query(
    `SELECT o.id, o.status, o.total_paise, o.fulfillment, o.expires_at,
            p.gateway_order_id, p.amount_paise
       FROM orders o JOIN payments p ON p.order_id = o.id
      WHERE o.id = $1 AND o.user_id = $2
      ORDER BY p.created_at DESC LIMIT 1`, [orderId, userId]);
  const o = rows[0];
  if (!o) throw notFound('ORDER_NOT_FOUND', 'Order not found');
  if (o.status !== 'PENDING_PAYMENT') throw conflict('ORDER_NOT_PAYABLE', 'This order is not waiting for payment');
  if (new Date(o.expires_at) <= new Date()) throw conflict('ORDER_EXPIRED', 'The payment window has closed');
  return {
    order: {
      id: o.id, status: o.status, totalPaise: o.total_paise,
      fulfillment: o.fulfillment, expiresAt: o.expires_at,
    },
    payment: {
      gatewayOrderId: o.gateway_order_id, amountPaise: o.amount_paise,
      currency: 'INR', keyId: publicKeyId(),
    },
  };
}

export async function checkout(userId, { fulfillment, deliveryAddress, idempotencyKey }) {
  if (!paymentsConfigured()) {
    throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not set up yet');
  }

  const replay = async () => {
    const prev = await query(
      'SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2', [userId, idempotencyKey]);
    return prev.rows[0] ? paymentFor(userId, prev.rows[0].id) : null;
  };
  if (idempotencyKey) {
    const again = await replay();
    if (again) return again;
  }

  let made;
  try {
    made = await withTransaction(async (c) => {
      const cart = (await c.query(
        'SELECT id, seller_id FROM carts WHERE user_id = $1 FOR UPDATE', [userId])).rows[0];
      if (!cart || !cart.seller_id) throw new AppError(422, 'CART_EMPTY', 'Your cart is empty');

      const shop = (await c.query(
        `SELECT verification::text AS v, is_open FROM seller_profiles WHERE id = $1`,
        [cart.seller_id])).rows[0];
      if (!shop || shop.v !== 'VERIFIED' || !shop.is_open) {
        throw conflict('SHOP_UNAVAILABLE', 'This shop is closed or unavailable right now');
      }

      // Lock the product rows (fixed order) so nobody else can take this stock meanwhile
      const items = (await c.query(
        `SELECT p.id, p.name, p.price_paise, p.stock, p.is_active, p.seller_id, ci.quantity
           FROM cart_items ci JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = $1 ORDER BY p.id FOR UPDATE OF p`, [cart.id])).rows;
      if (!items.length) throw new AppError(422, 'CART_EMPTY', 'Your cart is empty');

      let total = 0;
      for (const it of items) {
        if (!it.is_active || it.seller_id !== cart.seller_id) {
          throw conflict('ITEM_UNAVAILABLE', `${it.name} is no longer available`);
        }
        if (it.stock < it.quantity) {
          throw conflict('INSUFFICIENT_STOCK', `Only ${it.stock} of ${it.name} left`);
        }
        total += it.price_paise * it.quantity;
      }
      if (total < MIN_TOTAL_PAISE) throw new AppError(422, 'ORDER_TOO_SMALL', 'The minimum order is 1 rupee');
      if (total > MAX_TOTAL_PAISE) throw new AppError(422, 'ORDER_TOO_LARGE', 'This order is too large');

      const ids = items.map((i) => i.id);
      const qty = items.map((i) => i.quantity);

      const dec = await c.query(
        `UPDATE products p SET stock = p.stock - x.q
           FROM unnest($1::uuid[], $2::int[]) AS x(id, q)
          WHERE p.id = x.id AND p.stock >= x.q`, [ids, qty]);
      if (dec.rowCount !== items.length) throw conflict('INSUFFICIENT_STOCK', 'Some items just ran out of stock');

      const order = (await c.query(
        `INSERT INTO orders (user_id, seller_id, fulfillment, delivery_address, total_paise,
                             idempotency_key, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(mins => $7::int))
         RETURNING id`,
        [userId, cart.seller_id, fulfillment, fulfillment === 'DELIVERY' ? deliveryAddress : null,
          total, idempotencyKey ?? null, PAY_WINDOW_MINUTES])).rows[0];

      await c.query(
        `INSERT INTO order_items (order_id, product_id, name, unit_price_paise, quantity)
         SELECT $1, * FROM unnest($2::uuid[], $3::text[], $4::int[], $5::int[])`,
        [order.id, ids, items.map((i) => i.name), items.map((i) => i.price_paise), qty]);
      await c.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
         VALUES ($1, NULL, 'PENDING_PAYMENT', $2, 'Order created')`, [order.id, userId]);

      await c.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
      await c.query('UPDATE carts SET seller_id = NULL, updated_at = now() WHERE id = $1', [cart.id]);
      return { orderId: order.id, total };
    });
  } catch (err) {
    if (err.code === '23505' && idempotencyKey) {
      const again = await replay();
      if (again) return again;
    }
    throw err;
  }

  // The gateway call happens AFTER the commit, so no database locks are held during a network call
  try {
    const gatewayOrderId = await createGatewayOrder({
      amountPaise: made.total, receipt: made.orderId, notes: { orderId: made.orderId },
    });
    await query(
      'INSERT INTO payments (order_id, gateway_order_id, amount_paise) VALUES ($1, $2, $3)',
      [made.orderId, gatewayOrderId, made.total]);
  } catch (err) {
    await withTransaction((c) =>
      cancelUnpaidOrder(c, made.orderId, 'CANCELLED', 'Payment could not be started', userId))
      .catch(() => {}); // if even this fails, the expiry job releases the stock
    throw err;
  }
  return paymentFor(userId, made.orderId);
}

/** After the browser reports success. The signature proves the payment belongs to this order. */
export async function verifyPayment(userId, orderId, { paymentId, signature }) {
  const p = (await query(
    `SELECT p.gateway_order_id FROM payments p JOIN orders o ON o.id = p.order_id
      WHERE o.id = $1 AND o.user_id = $2 ORDER BY p.created_at DESC LIMIT 1`,
    [orderId, userId])).rows[0];
  if (!p) throw notFound('ORDER_NOT_FOUND', 'Order not found');
  if (!verifyCheckoutSignature(p.gateway_order_id, paymentId, signature)) {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Payment could not be verified');
  }
  const out = await withTransaction((c) =>
    applyPaid(c, { gatewayOrderId: p.gateway_order_id, paymentId, amountPaise: null }));
  return { paid: !!(out.placed || out.already), orderId };
}