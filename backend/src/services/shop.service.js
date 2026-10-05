import { query } from '../config/db.js';
import { notFound } from '../utils/AppError.js';
import { signedUrl } from './upload.service.js';

const LIMIT = 50;

// Great-circle distance in km. $1 = user lat, $2 = user lng. LEAST() guards asin's domain.
const KM = `6371 * 2 * asin(LEAST(1, sqrt(
  power(sin(radians(sp.lat - $1::double precision) / 2), 2) +
  cos(radians($1::double precision)) * cos(radians(sp.lat)) *
  power(sin(radians(sp.lng - $2::double precision) / 2), 2))))`;

export async function nearbyShops({ lat, lng, radiusKm }) {
  const r = Number(radiusKm) || 10;
  // Bounding box first: this is what lets the index do the heavy lifting
  const dLat = r / 111.32;
  const dLng = r / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  const { rows } = await query(
    `SELECT sp.id, sp.shop_name, sp.description, sp.address, sp.rating_avg, sp.rating_count,
            d.km AS distance_km,
            (SELECT path FROM shop_images si WHERE si.seller_id = sp.id
              ORDER BY si.position, si.id LIMIT 1) AS cover_path
       FROM seller_profiles sp
       CROSS JOIN LATERAL (SELECT ${KM} AS km) d
      WHERE sp.verification = 'VERIFIED' AND sp.is_open AND sp.lat IS NOT NULL
        AND sp.lat BETWEEN $3::double precision AND $4::double precision
        AND sp.lng BETWEEN $5::double precision AND $6::double precision
        AND d.km <= $7::double precision
      ORDER BY d.km, sp.id
      LIMIT $8`,
    [lat, lng, lat - dLat, lat + dLat, lng - dLng, lng + dLng, r, LIMIT]);

  return {
    items: rows.map((s) => ({
      id: s.id,
      shopName: s.shop_name,
      description: s.description,
      address: s.address,
      distanceKm: Math.round(s.distance_km * 10) / 10,
      ratingAvg: Number(s.rating_avg),
      ratingCount: s.rating_count,
      verified: true,
      coverUrl: s.cover_path ? signedUrl(s.cover_path) : null,
    })),
  };
}

export async function getShop(shopId) {
  const { rows } = await query(
    `SELECT id, shop_name, description, address, lat, lng, is_open, rating_avg, rating_count
       FROM seller_profiles WHERE id = $1 AND verification = 'VERIFIED'`, [shopId]);
  const s = rows[0];
  if (!s) throw notFound('SHOP_NOT_FOUND', 'Shop not found');

  const gallery = (await query(
    'SELECT id, path FROM shop_images WHERE seller_id = $1 ORDER BY position, id', [shopId])).rows;

  return {
    id: s.id,
    shopName: s.shop_name,
    description: s.description,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    isOpen: s.is_open,
    verified: true,
    ratingAvg: Number(s.rating_avg),
    ratingCount: s.rating_count,
    gallery: gallery.map((g) => ({ id: g.id, url: signedUrl(g.path) })),
  };
}