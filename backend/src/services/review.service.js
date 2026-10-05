import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

// One review per COMPLETED order; the shop's rating_avg / rating_count are recomputed in the same transaction
export async function createReview(userId, orderId, { rating, comment }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const o = await client.query(
      'SELECT seller_id, status FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId],
    );
    if (!o.rows[0]) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (o.rows[0].status !== 'COMPLETED') {
      throw new AppError(409, 'ORDER_NOT_COMPLETED', 'You can review a shop only after the order is completed');
    }
    const shopId = o.rows[0].seller_id;

    // Two reviews for the same shop at once wait for each other, so the average stays correct
    await client.query('SELECT id FROM seller_profiles WHERE id = $1 FOR UPDATE', [shopId]);

    const ins = await client.query(
      `INSERT INTO shop_reviews (order_id, user_id, seller_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (order_id) DO NOTHING
       RETURNING id, rating, comment, created_at`,
      [orderId, userId, shopId, rating, comment || null],
    );
    if (!ins.rows[0]) throw new AppError(409, 'ALREADY_REVIEWED', 'You already reviewed this order');

    await client.query(
      `UPDATE seller_profiles sp
          SET rating_count = s.c, rating_avg = s.a
         FROM (SELECT COUNT(*)::int AS c, COALESCE(ROUND(AVG(rating), 2), 0) AS a
                 FROM shop_reviews WHERE seller_id = $1) s
        WHERE sp.id = $1`,
      [shopId],
    );

    await client.query('COMMIT');
    return ins.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// A verified shop's reviews, newest first (uses shop_reviews_idx, no OFFSET)
export async function listShopReviews(shopId, { cursor, limit }) {
  const shop = await pool.query(
    "SELECT 1 FROM seller_profiles WHERE id = $1 AND verification = 'VERIFIED'",
    [shopId],
  );
  if (!shop.rows[0]) throw new AppError(404, 'SHOP_NOT_FOUND', 'Shop not found');

  const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const c = cursor ? decodeCursor(cursor) : { ts: null, id: null };

  const { rows } = await pool.query(
    `SELECT id, rating, comment, created_at, created_at::text AS cursor_ts
       FROM shop_reviews
      WHERE seller_id = $1
        AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
      ORDER BY created_at DESC, id DESC
      LIMIT $4`,
    [shopId, c.ts, c.id, take + 1],
  );

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map(({ cursor_ts, ...review }) => review),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}