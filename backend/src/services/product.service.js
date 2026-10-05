import { query } from '../config/db.js';
import { AppError, forbidden, notFound } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { storeImage, deleteStored, signedUrl } from './upload.service.js';

const MAX_PRODUCTS = 500;

const toDto = (p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  pricePaise: p.price_paise,
  stock: p.stock,
  inStock: p.stock > 0,
  imageUrl: p.image_path ? signedUrl(p.image_path) : null,
  isActive: p.is_active,
  createdAt: p.created_at,
});

async function sellerOf(userId) {
  const s = (await query(
    `SELECT id, verification::text AS verification FROM seller_profiles WHERE user_id = $1`,
    [userId])).rows[0];
  if (!s) throw notFound('SELLER_NOT_FOUND', 'Seller profile not found');
  return s;
}

/** Newest first, keyset pagination. Used by both the seller list and the public shop list. */
async function paged(whereSql, params, { limit, cursor }) {
  const n = Number(limit) || 20;
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT p.*, p.created_at::text AS cursor_ts
       FROM products p
      WHERE ${whereSql}
        AND ($2::timestamptz IS NULL OR (p.created_at, p.id) < ($2::timestamptz, $3::uuid))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $4`,
    [params[0], cur.ts, cur.id, n + 1]);
  const hasMore = rows.length > n;
  const page = hasMore ? rows.slice(0, n) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(toDto),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

// ------------------------------------------------------------ seller
export async function listMine(userId, opts) {
  const s = await sellerOf(userId);
  return paged('p.seller_id = $1', [s.id], opts);
}

export async function create(userId, b) {
  const s = await sellerOf(userId);
  if (s.verification !== 'VERIFIED') {
    throw forbidden('SELLER_NOT_VERIFIED', 'Your shop must be verified before you can add products');
  }
  // One statement: the limit check and the insert cannot be split by a concurrent request
  const ins = await query(
    `INSERT INTO products (seller_id, name, description, price_paise, stock)
     SELECT $1::uuid, $2, $3, $4, $5
      WHERE (SELECT count(*) FROM products WHERE seller_id = $1::uuid) < $6
  RETURNING *`,
    [s.id, b.name, b.description ?? null, b.pricePaise, b.stock, MAX_PRODUCTS]);
  if (!ins.rowCount) {
    throw new AppError(422, 'PRODUCT_LIMIT', `A shop can have at most ${MAX_PRODUCTS} products`);
  }
  return toDto(ins.rows[0]);
}

export async function update(userId, productId, b) {
  const s = await sellerOf(userId);
  const { rows } = await query(
    `UPDATE products
        SET name = COALESCE($3, name),
            description = COALESCE($4, description),
            price_paise = COALESCE($5, price_paise),
            stock = COALESCE($6, stock),
            is_active = COALESCE($7, is_active)
      WHERE id = $1 AND seller_id = $2
  RETURNING *`,
    [productId, s.id, b.name ?? null, b.description ?? null, b.pricePaise ?? null,
      b.stock ?? null, b.isActive ?? null]);
  if (!rows[0]) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
  return toDto(rows[0]);
}

export async function remove(userId, productId) {
  const s = await sellerOf(userId);
  try {
    const { rows } = await query(
      'DELETE FROM products WHERE id = $1 AND seller_id = $2 RETURNING image_path',
      [productId, s.id]);
    if (!rows[0]) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    if (rows[0].image_path) await deleteStored(rows[0].image_path);
    return { deleted: true, hidden: false };
  } catch (err) {
    if (err.code !== '23503') throw err; // not a foreign key problem
    // The product is part of past orders: keep the row, just hide it
    const hid = await query(
      'UPDATE products SET is_active = false WHERE id = $1 AND seller_id = $2 RETURNING id',
      [productId, s.id]);
    if (!hid.rowCount) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    return { deleted: false, hidden: true };
  }
}

export async function setImage(userId, productId, file) {
  const s = await sellerOf(userId);
  const old = (await query(
    'SELECT image_path FROM products WHERE id = $1 AND seller_id = $2', [productId, s.id])).rows[0];
  if (!old) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');

  const stored = await storeImage(file.buffer, file.detected.ext);
  try {
    const { rows } = await query(
      'UPDATE products SET image_path = $3 WHERE id = $1 AND seller_id = $2 RETURNING *',
      [productId, s.id, stored.path]);
    if (!rows[0]) throw notFound('PRODUCT_NOT_FOUND', 'Product not found');
    if (old.image_path) await deleteStored(old.image_path);
    return toDto(rows[0]);
  } catch (e) {
    await deleteStored(stored.path);
    throw e;
  }
}

// ------------------------------------------------------------ public (users)
export async function listForShop(sellerId, opts) {
  const shop = (await query(
    `SELECT 1 FROM seller_profiles WHERE id = $1 AND verification = 'VERIFIED'`, [sellerId])).rows[0];
  if (!shop) throw notFound('SHOP_NOT_FOUND', 'Shop not found');
  const out = await paged('p.seller_id = $1 AND p.is_active', [sellerId], opts);
  return { ...out, items: out.items.map(({ isActive, ...rest }) => rest) };
}