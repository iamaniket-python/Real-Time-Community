import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

// Customer's own orders, newest first (uses orders_user_idx, no OFFSET)
export async function listMyOrders(userId, { cursor, limit, status }) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const c = cursor ? decodeCursor(cursor) : { ts: null, id: null };

  const { rows } = await pool.query(
    `SELECT o.id, o.status, o.fulfillment, o.total_paise, o.created_at,
            o.created_at::text AS cursor_ts,
            sp.id AS shop_id, sp.shop_name,
            (SELECT COALESCE(SUM(oi.quantity), 0)::int
               FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       JOIN seller_profiles sp ON sp.id = o.seller_id
      WHERE o.user_id = $1
        AND ($2::text IS NULL OR o.status = $2::text)
        AND ($3::timestamptz IS NULL OR (o.created_at, o.id) < ($3::timestamptz, $4::uuid))
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $5`,
    [userId, status ?? null, c.ts, c.id, take + 1],
  );

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(({ cursor_ts, ...order }) => order),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

// One order of this customer. Someone else's order looks the same as a missing one.
export async function getMyOrder(userId, orderId) {
  const { rows } = await pool.query(
    `SELECT o.id, o.status, o.fulfillment, o.delivery_address, o.total_paise,
            o.expires_at, o.created_at, o.updated_at,
            sp.id AS shop_id, sp.shop_name, sp.address AS shop_address,
            sp.lat AS shop_lat, sp.lng AS shop_lng
       FROM orders o
       JOIN seller_profiles sp ON sp.id = o.seller_id
      WHERE o.id = $1 AND o.user_id = $2`,
    [orderId, userId],
  );
  if (!rows[0]) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

  const [items, history, payment, review] = await Promise.all([
    pool.query(
      `SELECT product_id, name, unit_price_paise, quantity
         FROM order_items WHERE order_id = $1 ORDER BY name`,
      [orderId],
    ),
    // Only status + time: the internal note column is never shown to customers
    pool.query(
      `SELECT to_status, created_at FROM order_status_history
        WHERE order_id = $1 ORDER BY created_at, id`,
      [orderId],
    ),
    pool.query(
      `SELECT status, amount_paise, paid_at FROM payments
        WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId],
    ),
    pool.query(
      `SELECT id, rating, comment, created_at FROM shop_reviews WHERE order_id = $1`,
      [orderId],
    ),
  ]);

  return {
    ...rows[0],
    items: items.rows,
    history: history.rows,
    payment: payment.rows[0] ?? null,
    review: review.rows[0] ?? null,
  };
}