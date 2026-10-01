import { pool, query, withTransaction } from '../config/db.js';
import { conflict, notFound } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { pushNotifications } from './notification.service.js';
import { logger } from '../utils/logger.js';

/** The requester rates the helper of a COMPLETED request, once. */
export async function rateRequest(userId, requestId, { score, comment }) {
  const result = await withTransaction(async (c) => {
    // Lock the request; non-owners get the same 404 as a missing request
    const { rows } = await c.query(
      'SELECT status, accepted_helper_id FROM help_requests WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [requestId, userId]);
    const r = rows[0];
    if (!r) throw notFound('REQUEST_NOT_FOUND', 'Request not found');
    if (r.status !== 'COMPLETED' || !r.accepted_helper_id) {
      throw conflict('REQUEST_NOT_COMPLETED', 'You can rate only after the job is completed');
    }

    const ins = await c.query(
      `INSERT INTO ratings (request_id, rater_id, helper_id, score, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (request_id) DO NOTHING
       RETURNING id, score, comment, created_at`,
      [requestId, userId, r.accepted_helper_id, score, comment ?? null]);
    if (!ins.rowCount) throw conflict('ALREADY_RATED', 'You have already rated this request');

    // Recompute from the source rows so the average can never drift
    const agg = await c.query(
      `UPDATE helper_profiles hp
          SET rating_count = s.n, rating_avg = s.avg
         FROM (SELECT count(*)::int AS n, round(avg(score)::numeric, 2) AS avg
                 FROM ratings WHERE helper_id = $1) s
        WHERE hp.id = $1
        RETURNING hp.user_id AS helper_user_id, hp.rating_avg, hp.rating_count`,
      [r.accepted_helper_id]);
    const h = agg.rows[0];

    const note = (await c.query(
      `INSERT INTO notifications (user_id, type, title, data)
       VALUES ($1, 'RATING_RECEIVED', 'You received a new rating', $2::jsonb)
       RETURNING *`,
      [h.helper_user_id, JSON.stringify({ requestId, score })])).rows[0];

    return { rating: ins.rows[0], helper: h, note };
  });

  try {
    await pushNotifications([result.note]); // after commit, best effort
  } catch (err) {
    logger.error({ err }, 'rating notification push failed');
  }

  const { rating, helper } = result;
  return {
    rating: { id: rating.id, requestId, score: rating.score, comment: rating.comment, createdAt: rating.created_at },
    helper: { ratingAvg: Number(helper.rating_avg), ratingCount: helper.rating_count },
  };
}

/** Public-to-authenticated-users list for one helper profile. First name only. */
export async function listHelperRatings(helperId, { limit, cursor }) {
  const hp = await query(
    'SELECT rating_avg, rating_count FROM helper_profiles WHERE id = $1', [helperId]);
  if (!hp.rows[0]) throw notFound('HELPER_NOT_FOUND', 'Helper not found');

  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await pool.query(
    `SELECT r.id, r.score, r.comment, r.created_at,
            r.created_at::text AS cursor_ts, split_part(u.name, ' ', 1) AS rater_name
       FROM ratings r JOIN users u ON u.id = r.rater_id
      WHERE r.helper_id = $1
        AND ($2::timestamptz IS NULL OR (r.created_at, r.id) < ($2::timestamptz, $3::uuid))
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $4`,
    [helperId, cur.ts, cur.id, limit + 1]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    summary: { ratingAvg: Number(hp.rows[0].rating_avg ?? 0), ratingCount: hp.rows[0].rating_count },
    items: page.map((r) => ({
      id: r.id, score: r.score, comment: r.comment, raterFirstName: r.rater_name, createdAt: r.created_at,
    })),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}