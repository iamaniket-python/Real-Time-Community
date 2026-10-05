import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

// What a seller may do: action -> [from, to]
const MOVES = {
  confirm: ['PLACED', 'CONFIRMED'],
  ready: ['CONFIRMED', 'READY'],
  complete: ['READY', 'COMPLETED'],
};

// orders.seller_id is seller_profiles.id, so find it from the logged-in user
async function shopIdOf(userId) {
  const { rows } = await pool.query('SELECT id FROM seller_profiles WHERE user_id = $1', [userId]);
  if (!rows[0]) throw new AppError(404, 'SELLER_NOT_FOUND', 'Seller profile not found');
  return rows[0].id;
}

// Paid orders of this shop, newest first (uses orders_seller_idx, no OFFSET)
export async function listShopOrders(userId, { cursor, limit, status }) {
  const shopId = await shopIdOf(userId);
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const c = cursor ? decodeCursor(cursor) : { ts: null, id: null };

  const { rows } = await pool.query(
    `SELECT o.id, o.status, o.fulfillment, o.total_paise, o.created_at,
            o.created_at::text AS cursor_ts,
            (SELECT COALESCE(SUM(oi.quantity), 0)::int
               FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
      WHERE o.seller_id = $1
        AND (CASE WHEN $2::text IS NULL
                  THEN o.status NOT IN ('PENDING_PAYMENT', 'EXPIRED')
                  ELSE o.status = $2::text END)
        AND ($3::timestamptz IS NULL OR (o.created_at, o.id) < ($3::timestamptz, $4::uuid))
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT $5`,
    [shopId, status ?? null, c.ts, c.id, take + 1],
  );

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(({ cursor_ts, ...order }) => order),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

// One order of this shop. Unpaid/expired orders and other shops' orders look missing.
export async function getShopOrder(userId, orderId) {
  const shopId = await shopIdOf(userId);

  const { rows } = await pool.query(
    `SELECT o.id, o.status, o.fulfillment, o.delivery_address, o.total_paise,
            o.created_at, o.updated_at, u.phone AS customer_phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
      WHERE o.id = $1 AND o.seller_id = $2
        AND o.status NOT IN ('PENDING_PAYMENT', 'EXPIRED')`,
    [orderId, shopId],
  );
  if (!rows[0]) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

  const [items, history, review] = await Promise.all([
    pool.query(
      `SELECT product_id, name, unit_price_paise, quantity
         FROM order_items WHERE order_id = $1 ORDER BY name`,
      [orderId],
    ),
    pool.query(
      `SELECT to_status, created_at FROM order_status_history
        WHERE order_id = $1 ORDER BY created_at, id`,
      [orderId],
    ),
    pool.query(
      `SELECT rating, comment, created_at FROM shop_reviews WHERE order_id = $1`,
      [orderId],
    ),
  ]);

  return {
    ...rows[0],
    items: items.rows,
    history: history.rows,
    review: review.rows[0] ?? null,
  };
}

// confirm / ready / complete: status change + history row in one transaction
export async function moveOrder(userId, orderId, action) {
  const move = MOVES[action];
  if (!move) throw new AppError(400, 'BAD_ACTION', 'Unknown order action');
  const [from, to] = move;
  const shopId = await shopIdOf(userId);

  let updated = null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Only moves if the order is still in the expected status (a double click cannot apply twice)
    const res = await client.query(
      `UPDATE orders SET status = $4, updated_at = now()
        WHERE id = $1 AND seller_id = $2 AND status = $3
        RETURNING id, status, updated_at`,
      [orderId, shopId, from, to],
    );
    if (res.rows[0]) {
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by)
         VALUES ($1, $2, $3, $4)`,
        [orderId, from, to, userId],
      );
      await client.query('COMMIT');
      updated = res.rows[0];
    } else {
      await client.query('ROLLBACK');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  if (updated) return updated;

  // Nothing moved: either not this shop's order, or it is in another status
  const { rows } = await pool.query(
    'SELECT status FROM orders WHERE id = $1 AND seller_id = $2',
    [orderId, shopId],
  );
  if (!rows[0]) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  throw new AppError(409, 'ORDER_STATE', `Order is ${rows[0].status}, it cannot be marked ${to}`);
}