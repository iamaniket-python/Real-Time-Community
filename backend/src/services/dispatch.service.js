import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { boundingBox, haversineSql, roundCoord, roundKm } from '../utils/geo.js';
import { emitToHelper, joinOffers, getIO } from '../sockets/io.js';
import { pushNotifications } from './notification.service.js';
import { logger } from '../utils/logger.js';

/**
 * Offers a SEARCHING request to eligible helpers whose distance is in (minKm, maxKm].
 * On creation minKm is -1 (everyone in range). On radius expansion minKm is the old
 * radius, so only helpers who just came into range are contacted.
 * Never throws: real-time is best effort, the database is the source of truth.
 */
export async function dispatchRequest(requestId, { minKm = -1, maxKm } = {}) {
  if (!getIO()) return 0;
  try {
    const r = (await query(
      `SELECT r.id, r.title, r.description, r.category_id, c.name AS category_name,
              r.lat, r.lng, r.search_radius_km, r.expires_at, r.created_at,
              split_part(u.name, ' ', 1) AS first_name
         FROM help_requests r
         JOIN categories c ON c.id = r.category_id
         JOIN users u ON u.id = r.user_id
        WHERE r.id = $1 AND r.status = 'SEARCHING'`, [requestId])).rows[0];
    if (!r) return 0;

    const radius = maxKm ?? Number(r.search_radius_km);
    const box = boundingBox(r.lat, r.lng, radius);
    const dist = haversineSql('$2::double precision', '$3::double precision', 'hp.current_lat', 'hp.current_lng');

    const { rows: helpers } = await query(
      `SELECT * FROM (
         SELECT hp.id AS helper_id, hp.user_id, ${dist} AS distance_km
           FROM helper_profiles hp
           JOIN users u ON u.id = hp.user_id AND u.status = 'ACTIVE'
          WHERE hp.is_available AND hp.verification = 'VERIFIED'
            AND hp.current_lat BETWEEN $4::double precision AND $5::double precision
            AND hp.current_lng BETWEEN $6::double precision AND $7::double precision
            AND hp.location_updated_at > now() - make_interval(mins => $8::int)
            AND EXISTS (SELECT 1 FROM helper_categories hc
                         WHERE hc.helper_id = hp.id AND hc.category_id = $9::int)
            AND NOT EXISTS (SELECT 1 FROM help_requests j
                             WHERE j.accepted_helper_id = hp.id
                               AND j.status IN ('ACCEPTED','ARRIVING','IN_PROGRESS'))
            AND NOT EXISTS (SELECT 1 FROM request_rejections rj
                             WHERE rj.request_id = $1::uuid AND rj.helper_id = hp.id)
       ) t
       WHERE distance_km > $10::double precision AND distance_km <= $11::double precision
       ORDER BY distance_km
       LIMIT 200`,
      [requestId, r.lat, r.lng, box.minLat, box.maxLat, box.minLng, box.maxLng,
       env.HELPER_LOCATION_MAX_AGE_MINUTES, r.category_id, minKm, radius]);
    if (!helpers.length) return 0;

    // One INSERT for all helpers
    const { rows: notes } = await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       SELECT unnest($1::uuid[]), 'NEW_REQUEST_NEARBY', 'New help request near you', $2, $3::jsonb
       RETURNING *`,
      [helpers.map((h) => h.user_id), r.title, JSON.stringify({ requestId })]);

    for (const h of helpers) {
      joinOffers(h.helper_id, requestId); // so request:unavailable can reach them later
      emitToHelper(h.helper_id, 'request:new', {
        id: r.id,
        title: r.title,
        description: r.description,
        category: { id: r.category_id, name: r.category_name },
        userFirstName: r.first_name,
        distanceKm: roundKm(h.distance_km),
        approxLat: roundCoord(r.lat),
        approxLng: roundCoord(r.lng),
        radiusKm: Number(r.search_radius_km),
        createdAt: r.created_at,
        expiresAt: r.expires_at,
      });
    }
    await pushNotifications(notes);
    return helpers.length;
  } catch (err) {
    logger.error({ err, requestId }, 'dispatch failed');
    return 0;
  }
}