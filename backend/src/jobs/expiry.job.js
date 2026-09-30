import { query } from '../config/db.js';
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

export function startExpiryJob(intervalMs = 15_000) {
  const timer = setInterval(async () => {
    try {
      const n = await expireStaleRequests();
      if (n) logger.info({ expired: n }, 'expired stale requests');
    } catch (err) {
      logger.error({ err }, 'expiry job failed');
    }
  }, intervalMs);
  timer.unref(); // don't keep the process alive just for this timer
  return () => clearInterval(timer);
}