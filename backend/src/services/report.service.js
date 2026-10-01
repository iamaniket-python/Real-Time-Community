import { withTransaction } from '../config/db.js';
import { conflict, notFound } from '../utils/AppError.js';
import { emitToAdmins } from '../sockets/io.js';
import { logger } from '../utils/logger.js';

/** A participant of a job reports the other participant. */
export async function createReport(userId, requestId, { reason, details }) {
  const result = await withTransaction(async (c) => {
    // Lock the request row; non-participants get the same 404 as a missing request
    const { rows } = await c.query(
      `SELECT r.user_id, hp.user_id AS helper_user_id
         FROM help_requests r
         LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
        WHERE r.id = $1 AND (r.user_id = $2 OR hp.user_id = $2)
        FOR UPDATE OF r`,
      [requestId, userId]);
    const r = rows[0];
    if (!r || !r.helper_user_id) throw notFound('REQUEST_NOT_FOUND', 'Request not found');

    // The target is derived on the server, never taken from the client
    const reportedId = r.user_id === userId ? r.helper_user_id : r.user_id;

    const dup = await c.query(
      'SELECT 1 FROM reports WHERE request_id = $1 AND reporter_id = $2 LIMIT 1',
      [requestId, userId]);
    if (dup.rowCount) throw conflict('ALREADY_REPORTED', 'You have already reported this job');

    const ins = await c.query(
      `INSERT INTO reports (reporter_id, reported_user_id, request_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, reason, status, created_at`,
      [userId, reportedId, requestId, reason, details ?? null]);
    return ins.rows[0];
  });

  try {
    // After commit, best effort. No free text goes into the socket payload.
    emitToAdmins('report:new', { reportId: result.id, requestId, reason: result.reason });
  } catch (err) {
    logger.error({ err }, 'report push failed');
  }

  return {
    report: {
      id: result.id,
      requestId,
      reason: result.reason,
      status: result.status,
      createdAt: result.created_at,
    },
  };
}