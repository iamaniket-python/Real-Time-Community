import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { boundingBox, roundCoord, roundKm } from '../utils/geo.js';
import { boundingBox, roundCoord, roundKm, haversineSql } from '../utils/geo.js';
import { notFound } from '../utils/AppError.js';

// Haversine distance in km between ($1, $2) and a helper's position
export const HAVERSINE_SQL = `
  6371 * 2 * asin(sqrt(least(1,
    power(sin(radians(hp.current_lat - $1::double precision) / 2), 2) +
    cos(radians($1::double precision)) * cos(radians(hp.current_lat)) *
    power(sin(radians(hp.current_lng - $2::double precision) / 2), 2)
  )))`;

/**
 * Online, verified helpers who provide the category and are within radiusKm.
 * The WHERE clause repeats "is_available AND verification = 'VERIFIED'" literally
 * so Postgres can use the partial index helper_match_idx.
 */
export async function findNearbyHelpers({ lat, lng, categoryId, radiusKm, limit }) {
  const radius = Math.min(radiusKm ?? env.REQUEST_SEARCH_RADIUS_KM, env.MATCH_MAX_RADIUS_KM);
  const box = boundingBox(lat, lng, radius);

  const { rows } = await query(
    `SELECT * FROM (
       SELECT hp.id, split_part(u.name, ' ', 1) AS first_name,
              hp.rating_avg, hp.rating_count, hp.current_lat, hp.current_lng,
              ${HAVERSINE_SQL} AS distance_km
         FROM helper_profiles hp
         JOIN users u ON u.id = hp.user_id AND u.status = 'ACTIVE'
        WHERE hp.is_available AND hp.verification = 'VERIFIED'
          AND hp.current_lat BETWEEN $3::double precision AND $4::double precision
          AND hp.current_lng BETWEEN $5::double precision AND $6::double precision
          AND hp.location_updated_at > now() - make_interval(mins => $7::int)
          AND EXISTS (SELECT 1 FROM helper_categories hc
                       WHERE hc.helper_id = hp.id AND hc.category_id = $8::int)
          AND NOT EXISTS (SELECT 1 FROM help_requests r
                           WHERE r.accepted_helper_id = hp.id
                             AND r.status IN ('ACCEPTED','ARRIVING','IN_PROGRESS'))
     ) t
     WHERE distance_km <= $9::double precision
     ORDER BY distance_km
     LIMIT $10::int`,
    [lat, lng, box.minLat, box.maxLat, box.minLng, box.maxLng,
     env.HELPER_LOCATION_MAX_AGE_MINUTES, categoryId, radius,
     Math.min(limit ?? env.NEARBY_HELPERS_LIMIT, env.NEARBY_HELPERS_LIMIT)],
  );

  return {
    radiusKm: radius,
    helpers: rows.map((h) => ({
      id: h.id,
      firstName: h.first_name,
      ratingAvg: Number(h.rating_avg),
      ratingCount: h.rating_count,
      distanceKm: roundKm(h.distance_km),
      approxLat: roundCoord(h.current_lat),
      approxLng: roundCoord(h.current_lng),
    })),
  };
}
export async function getIncomingRequests(helperUserId) {
  const hp = (await query(
    `SELECT hp.id, hp.verification, hp.is_available, hp.current_lat, hp.current_lng,
            (hp.location_updated_at > now() - make_interval(mins => $2::int)) AS location_fresh,
            EXISTS (SELECT 1 FROM help_requests r
                     WHERE r.accepted_helper_id = hp.id
                       AND r.status IN ('ACCEPTED','ARRIVING','IN_PROGRESS')) AS busy,
            COALESCE((SELECT array_agg(category_id) FROM helper_categories
                       WHERE helper_id = hp.id), '{}') AS category_ids
       FROM helper_profiles hp WHERE hp.user_id = $1`,
    [helperUserId, env.HELPER_LOCATION_MAX_AGE_MINUTES])).rows[0];
  if (!hp) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');

  // Explain why the list is empty, so the UI can show the right message
  const reason =
    hp.verification !== 'VERIFIED' ? 'NOT_VERIFIED'
    : !hp.is_available ? 'OFFLINE'
    : hp.busy ? 'BUSY'
    : !hp.location_fresh ? 'NO_LOCATION'
    : !hp.category_ids.length ? 'NO_CATEGORIES'
    : null;
  if (reason) return { items: [], reason };

  const box = boundingBox(hp.current_lat, hp.current_lng, env.MATCH_MAX_RADIUS_KM);
  const dist = haversineSql('$1::double precision', '$2::double precision', 'r.lat', 'r.lng');

  const { rows } = await query(
    `SELECT * FROM (
       SELECT r.id, r.title, r.description, r.category_id, c.name AS category_name,
              r.lat, r.lng, r.search_radius_km, r.created_at, r.expires_at,
              split_part(u.name, ' ', 1) AS user_first_name,
              ${dist} AS distance_km
         FROM help_requests r
         JOIN categories c ON c.id = r.category_id
         JOIN users u ON u.id = r.user_id
        WHERE r.status = 'SEARCHING'
          AND r.expires_at > now()
          AND r.category_id = ANY($3::int[])
          AND r.lat BETWEEN $5::double precision AND $6::double precision
          AND r.lng BETWEEN $7::double precision AND $8::double precision
          AND NOT EXISTS (SELECT 1 FROM request_rejections rj
                           WHERE rj.request_id = r.id AND rj.helper_id = $4::uuid)
     ) t
     WHERE distance_km <= search_radius_km
     ORDER BY distance_km, created_at
     LIMIT $9::int`,
    [hp.current_lat, hp.current_lng, hp.category_ids, hp.id,
     box.minLat, box.maxLat, box.minLng, box.maxLng, 30]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: { id: r.category_id, name: r.category_name },
      userFirstName: r.user_first_name,
      distanceKm: roundKm(r.distance_km),
      approxLat: roundCoord(r.lat),
      approxLng: roundCoord(r.lng),
      radiusKm: Number(r.search_radius_km),
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    })),
    reason: null,
  };
}