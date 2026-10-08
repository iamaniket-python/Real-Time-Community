import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { signedUrl } from './upload.service.js';

// Escape LIKE wildcards so "50%" or "a_b" is searched literally
const likePattern = (q) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

async function searchProducts(q, limit, cursor) {
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT p.id, p.name, p.description, p.price_paise, p.stock, p.image_path,
            sp.id AS shop_id, sp.shop_name, p.created_at::text AS cursor_ts
       FROM products p
       JOIN seller_profiles sp ON sp.id = p.seller_id
      WHERE sp.verification = 'VERIFIED' AND p.is_active
        AND p.name ILIKE $1
        AND ($2::timestamptz IS NULL OR (p.created_at, p.id) < ($2::timestamptz, $3::uuid))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $4`,
    [likePattern(q), cur.ts, cur.id, limit + 1]);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      pricePaise: p.price_paise,
      stock: p.stock,
      inStock: p.stock > 0,
      imageUrl: p.image_path ? signedUrl(p.image_path) : null,
      shopId: p.shop_id,
      shopName: p.shop_name,
    })),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

// Shop cursor = JSON {n: lowercase name, id}, base64url
function decodeShopCursor(cursor) {
  try {
    const { n, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (typeof n !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('bad');
    return { n, id };
  } catch {
    throw new AppError(400, 'INVALID_CURSOR', 'Invalid pagination cursor');
  }
}

async function searchShops(q, limit, cursor) {
  const cur = cursor ? decodeShopCursor(cursor) : { n: null, id: null };
  const { rows } = await query(
    `SELECT sp.id, sp.shop_name, sp.description, sp.address, sp.rating_avg, sp.rating_count,
            lower(sp.shop_name) AS sort_name,
            (SELECT path FROM shop_images si WHERE si.seller_id = sp.id
              ORDER BY si.position, si.id LIMIT 1) AS cover_path
       FROM seller_profiles sp
      WHERE sp.verification = 'VERIFIED'
        AND sp.shop_name ILIKE $1
        AND ($2::text IS NULL OR (lower(sp.shop_name), sp.id) > ($2::text, $3::uuid))
      ORDER BY lower(sp.shop_name), sp.id
      LIMIT $4`,
    [likePattern(q), cur.n, cur.id, limit + 1]);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map((s) => ({
      id: s.id,
      shopName: s.shop_name,
      description: s.description,
      address: s.address,
      ratingAvg: Number(s.rating_avg),
      ratingCount: s.rating_count,
      verified: true,
      coverUrl: s.cover_path ? signedUrl(s.cover_path) : null,
    })),
    nextCursor: hasMore
      ? Buffer.from(JSON.stringify({ n: last.sort_name, id: last.id })).toString('base64url')
      : null,
  };
}

export async function search({ q, type, limit, cursor }) {
  const n = Number(limit) || 20;
  return type === 'shops' ? searchShops(q, n, cursor) : searchProducts(q, n, cursor);
}