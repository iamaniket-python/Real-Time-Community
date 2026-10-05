import { pool, query, withTransaction } from '../config/db.js';
import { AppError, conflict, notFound } from '../utils/AppError.js';
import { signedUrl } from './upload.service.js';

const MAX_ITEMS = 50;

export async function getCart(userId) {
  const { rows } = await query(
    `SELECT c.seller_id, sp.shop_name, sp.is_open, sp.verification::text AS verification,
            ci.product_id, ci.quantity,
            p.name, p.price_paise, p.stock, p.is_active, p.image_path
       FROM carts c
       LEFT JOIN seller_profiles sp ON sp.id = c.seller_id
       LEFT JOIN cart_items ci ON ci.cart_id = c.id
       LEFT JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = $1
      ORDER BY p.name, ci.product_id`, [userId]);

  if (!rows.length) return { shop: null, items: [], totalPaise: 0, canCheckout: false };

  const shopOk = rows[0].verification === 'VERIFIED';
  const items = rows.filter((r) => r.product_id).map((r) => ({
    productId: r.product_id,
    name: r.name,
    pricePaise: r.price_paise,
    quantity: r.quantity,
    linePaise: r.price_paise * r.quantity,
    imageUrl: r.image_path ? signedUrl(r.image_path) : null,
    available: r.is_active && r.stock >= r.quantity && shopOk,
  }));

  return {
    shop: rows[0].seller_id
      ? { id: rows[0].seller_id, name: rows[0].shop_name, isOpen: rows[0].is_open }
      : null,
    items,
    totalPaise: items.reduce((a, i) => a + i.linePaise, 0),
    canCheckout: items.length > 0 && items.every((i) => i.available) && !!rows[0].is_open && shopOk,
  };
}

export async function setItem(userId, { productId, quantity, replace }) {
  await withTransaction(async (c) => {
    // ON CONFLICT ... DO UPDATE also locks the cart row until commit, so two requests queue up
    const cart = (await c.query(
      `INSERT INTO carts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING id, seller_id`, [userId])).rows[0];

    if (quantity === 0) {
      await c.query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart.id, productId]);
      await c.query(
        `UPDATE carts SET seller_id = NULL
          WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = $1)`, [cart.id]);
      return;
    }

    const p = (await c.query(
      `SELECT p.seller_id, p.stock, p.is_active, sp.verification::text AS verification
         FROM products p JOIN seller_profiles sp ON sp.id = p.seller_id WHERE p.id = $1`,
      [productId])).rows[0];
    if (!p || !p.is_active || p.verification !== 'VERIFIED') {
      throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    }
    if (p.stock < quantity) throw conflict('INSUFFICIENT_STOCK', `Only ${p.stock} left in stock`);

    const count = (await c.query(
      'SELECT count(*)::int AS n FROM cart_items WHERE cart_id = $1', [cart.id])).rows[0].n;

    if (cart.seller_id && cart.seller_id !== p.seller_id && count > 0) {
      if (!replace) {
        throw conflict('CART_OTHER_SHOP',
          'Your cart has items from another shop. Clear it first, or confirm replacing it.');
      }
      await c.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
    }

    const existing = (await c.query(
      'SELECT 1 FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart.id, productId])).rowCount;
    if (!existing && count >= MAX_ITEMS && !(cart.seller_id !== p.seller_id)) {
      throw new AppError(422, 'CART_FULL', `A cart can hold at most ${MAX_ITEMS} different products`);
    }

    await c.query('UPDATE carts SET seller_id = $2 WHERE id = $1', [cart.id, p.seller_id]);
    await c.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [cart.id, productId, quantity]);
  });
  return getCart(userId);
}

export const removeItem = (userId, productId) => setItem(userId, { productId, quantity: 0 });

export async function clearCart(userId) {
  await pool.query(
    `DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1)`, [userId]);
  await pool.query('UPDATE carts SET seller_id = NULL, updated_at = now() WHERE user_id = $1', [userId]);
  return { shop: null, items: [], totalPaise: 0, canCheckout: false };
}