import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Expires stale SEARCHING requests in one statement: status change,
 * history row and user notification all commit together. Safe to run on
 * several server instances at once, because a row can only match once.
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
    ), notif AS (
      INSERT INTO notifications (user_id, type, title, data)
      SELECT user_id, 'REQUEST_EXPIRED', 'No helper was available for your request',
             jsonb_build_object('requestId', id)
        FROM expired
    )
    SELECT count(*)::int AS n FROM expired`);
  return rows[0].n;
}

/**
 * Widens the search radius of requests nobody has taken yet. Returns the
 * expanded requests so Phase 4 can notify helpers who just came into range.
 */
export async function expandSearchRadius() {
  const { rows } = await query(
    `UPDATE help_requests
        SET search_radius_km = LEAST(search_radius_km + $1::numeric, $2::numeric),
            radius_expanded_at = now()
      WHERE status = 'SEARCHING'
        AND expires_at > now()
        AND search_radius_km < $2::numeric
        AND COALESCE(radius_expanded_at, created_at) <= now() - make_interval(secs => $3::double precision)
      RETURNING id, user_id, category_id, lat, lng, search_radius_km`,
    [env.REQUEST_RADIUS_STEP_KM, env.MATCH_MAX_RADIUS_KM, env.REQUEST_EXPANSION_INTERVAL_SECONDS]);
  return rows;
}

export function startExpiryJob(intervalMs = 15_000) {
  const timer = setInterval(async () => {
    try {
      const expired = await expireStaleRequests();
      if (expired) logger.info({ expired }, 'expired stale requests');
      const widened = await expandSearchRadius();
      if (widened.length) logger.info({ expanded: widened.length }, 'expanded search radius');
    } catch (err) {
      logger.error({ err }, 'request maintenance job failed');
    }
  }, intervalMs);
  timer.unref(); // don't keep the process alive just for this timer
  return () => clearInterval(timer);
}