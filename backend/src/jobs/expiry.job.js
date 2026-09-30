import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { pushNotifications } from '../services/notification.service.js';
import { dispatchRequest } from '../services/dispatch.service.js';
import { emitRequestEvent, closeOffers } from '../sockets/io.js';

/**
 * Expires stale requests: status change, history row and user notification commit
 * together in one statement, then the users are told live. Safe on several instances.
 */
export async function expireStaleRequests() {
  const { rows } = await query(`
    WITH expired AS (
      UPDATE help_requests
         SET status = 'EXPIRED'
       WHERE status IN ('PENDING','SEARCHING') AND expires_at <= now()
      RETURNING id, user_id
    ), hist AS (
      INSERT INTO request_status_history (request_id, from_status, to_status, note)
      SELECT id, 'SEARCHING', 'EXPIRED', 'No helper accepted in time' FROM expired
    )
    INSERT INTO notifications (user_id, type, title, data)
    SELECT user_id, 'REQUEST_EXPIRED', 'No helper was available for your request',
           jsonb_build_object('requestId', id)
      FROM expired
    RETURNING *`);

  for (const n of rows) {
    const requestId = n.data.requestId;
    emitRequestEvent({ userIds: [n.user_id], requestId }, 'request:status_changed',
      { requestId, status: 'EXPIRED', at: new Date().toISOString() });
    closeOffers(requestId, 'EXPIRED');
  }
  await pushNotifications(rows);
  return rows.length;
}

/**
 * Widens the radius of requests nobody has taken. Returns the widened requests,
 * including old_radius, so helpers who just came into range can be offered them.
 */
export async function expandSearchRadius() {
  const { rows } = await query(
    `WITH due AS (
       SELECT id, search_radius_km AS old_radius
         FROM help_requests
        WHERE status = 'SEARCHING'
          AND expires_at > now()
          AND search_radius_km < $2::numeric
          AND COALESCE(radius_expanded_at, created_at) <= now() - make_interval(secs => $3::double precision)
          FOR UPDATE SKIP LOCKED
     )
     UPDATE help_requests r
        SET search_radius_km = LEAST(r.search_radius_km + $1::numeric, $2::numeric),
            radius_expanded_at = now()
       FROM due
      WHERE r.id = due.id
     RETURNING r.id, r.user_id, r.category_id, r.lat, r.lng, r.search_radius_km, due.old_radius`,
    [env.REQUEST_RADIUS_STEP_KM, env.MATCH_MAX_RADIUS_KM, env.REQUEST_EXPANSION_INTERVAL_SECONDS]);
  return rows;
}

export function startExpiryJob(intervalMs = 15_000) {
  const timer = setInterval(async () => {
    try {
      const expired = await expireStaleRequests();
      if (expired) logger.info({ expired }, 'expired stale requests');

      const widened = await expandSearchRadius();
      if (widened.length) {
        logger.info({ expanded: widened.length }, 'expanded search radius');
        await Promise.all(widened.map((w) => {
          emitRequestEvent({ userIds: [w.user_id], requestId: w.id }, 'request:radius_expanded',
            { requestId: w.id, radiusKm: Number(w.search_radius_km) });
          return dispatchRequest(w.id, { minKm: Number(w.old_radius), maxKm: Number(w.search_radius_km) });
        }));
      }
    } catch (err) {
      logger.error({ err }, 'request maintenance job failed');
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}