import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError, conflict, notFound, forbidden } from '../utils/AppError.js';
import { haversineSql } from '../utils/geo.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { createNotification, pushNotifications } from './notification.service.js';
import { dispatchRequest } from './dispatch.service.js';
import { emitRequestEvent, closeOffers } from '../sockets/io.js';
import { logger } from '../utils/logger.js';

// Real-time pushes run AFTER the commit and never fail the request.
const afterCommit = (label, fn) =>
  Promise.resolve().then(fn).catch((err) => logger.error({ err, label }, 'realtime step failed'));

const SELECT = `
  r.id, r.user_id, r.category_id, c.name AS category_name, r.title, r.description,
  r.image_url, r.address, r.lat, r.lng, r.status, r.search_radius_km,
  r.accepted_helper_id, hp.user_id AS helper_user_id,
  r.accepted_at, r.completed_at, r.expires_at, r.created_at`;
const FROM = `
  FROM help_requests r
  JOIN categories c ON c.id = r.category_id
  LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id`;

const toDto = (r) => ({
  id: r.id,
  category: { id: r.category_id, name: r.category_name },
  title: r.title,
  description: r.description,
  imageUrl: r.image_url,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  status: r.status,
  searchRadiusKm: Number(r.search_radius_km),
  acceptedHelperId: r.accepted_helper_id,
  acceptedAt: r.accepted_at,
  completedAt: r.completed_at,
  expiresAt: r.expires_at,
  createdAt: r.created_at,
});

// ---------------------------------------------------------------- create
export async function createRequest(userId, input) {
  const cat = await query('SELECT id FROM categories WHERE id = $1 AND is_active', [input.categoryId]);
  if (!cat.rowCount) throw new AppError(422, 'CATEGORY_NOT_FOUND', 'Category not found');

  let result;
  try {
    result = await withTransaction(async (c) => {
      const ins = await c.query(
        `INSERT INTO help_requests
           (user_id, category_id, title, description, address, lat, lng,
            search_radius_km, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (user_id, idempotency_key) DO NOTHING
         RETURNING id`,
        [userId, input.categoryId, input.title, input.description, input.address ?? null,
         input.lat, input.lng, env.REQUEST_SEARCH_RADIUS_KM, input.idempotencyKey ?? null]);

      if (!ins.rowCount) {
        // Same idempotency key sent again: return the original request
        const prev = await c.query(
          'SELECT id FROM help_requests WHERE user_id = $1 AND idempotency_key = $2',
          [userId, input.idempotencyKey]);
        return { id: prev.rows[0].id, created: false };
      }

      const id = ins.rows[0].id;
      await c.query(
        `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by)
         VALUES ($1, NULL, 'PENDING', $2)`, [id, userId]);
      await c.query(
        `UPDATE help_requests
            SET status = 'SEARCHING', expires_at = now() + make_interval(secs => $2)
          WHERE id = $1`, [id, env.REQUEST_TIMEOUT_SECONDS]);
      await c.query(
        `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by)
         VALUES ($1, 'PENDING', 'SEARCHING', $2)`, [id, userId]);
      return { id, created: true };
    });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'one_active_request_per_user') {
      throw conflict('ACTIVE_REQUEST_EXISTS', 'You already have an active request');
    }
    throw err;
  }

  if (result.created) void afterCommit('dispatch', () => dispatchRequest(result.id));

  const { rows } = await query(`SELECT ${SELECT} ${FROM} WHERE r.id = $1`, [result.id]);
  return { request: toDto(rows[0]), created: result.created };
}

// ---------------------------------------------------------------- read
export async function getRequest(id, viewer) {
  const { rows } = await query(`SELECT ${SELECT} ${FROM} WHERE r.id = $1`, [id]);
  const r = rows[0];
  if (!r) throw notFound('REQUEST_NOT_FOUND', 'Request not found');

  const allowed = viewer.role === 'ADMIN' || r.user_id === viewer.id || r.helper_user_id === viewer.id;
  // 404 (not 403) so outsiders can't probe which request ids exist
  if (!allowed) throw notFound('REQUEST_NOT_FOUND', 'Request not found');

  const history = await query(
    `SELECT from_status, to_status, note, created_at
       FROM request_status_history WHERE request_id = $1 ORDER BY created_at, id`, [id]);

  return {
    ...toDto(r),
    statusHistory: history.rows.map((h) => ({
      from: h.from_status, to: h.to_status, note: h.note, at: h.created_at,
    })),
  };
}

async function pagedRequests(whereSql, params, { limit, cursor, status }) {
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT ${SELECT}, r.created_at::text AS cursor_ts ${FROM}
      WHERE ${whereSql}
        AND ($2::request_status IS NULL OR r.status = $2::request_status)
        AND ($3::timestamptz IS NULL OR (r.created_at, r.id) < ($3::timestamptz, $4::uuid))
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $5`,
    [params[0], status ?? null, cur.ts, cur.id, limit + 1]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(toDto),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

export const listMyRequests = (userId, opts) => pagedRequests('r.user_id = $1', [userId], opts);

export const listHelperJobs = (helperUserId, opts) =>
  pagedRequests('r.accepted_helper_id = (SELECT id FROM helper_profiles WHERE user_id = $1)', [helperUserId], opts);

// ---------------------------------------------------------------- accept (race-safe)
export async function acceptRequest(requestId, helperUserId) {
  let info;
  try {
    info = await withTransaction(async (c) => {
      const hp = (await c.query(
        `SELECT id, verification, is_available, current_lat, current_lng,
                (location_updated_at > now() - make_interval(mins => $2::int)) AS location_fresh
           FROM helper_profiles WHERE user_id = $1`,
        [helperUserId, env.HELPER_LOCATION_MAX_AGE_MINUTES])).rows[0];
      if (!hp) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');
      if (hp.verification !== 'VERIFIED') throw forbidden('HELPER_NOT_VERIFIED', 'Your profile is not verified');
      if (!hp.is_available) throw new AppError(409, 'HELPER_OFFLINE', 'Go online to accept requests');
      if (!hp.location_fresh || hp.current_lat == null) {
        throw new AppError(409, 'HELPER_LOCATION_UNKNOWN', 'Share your current location to accept requests');
      }

      const distance = haversineSql('$3::double precision', '$4::double precision', 'r.lat', 'r.lng');

      // The atomic step: only one concurrent caller can match this WHERE clause
      const upd = await c.query(
        `UPDATE help_requests r
            SET status = 'ACCEPTED', accepted_helper_id = $2, accepted_at = now()
          WHERE r.id = $1
            AND r.status = 'SEARCHING'
            AND r.accepted_helper_id IS NULL
            AND (r.expires_at IS NULL OR r.expires_at > now())
            AND EXISTS (SELECT 1 FROM helper_categories hc
                         WHERE hc.helper_id = $2 AND hc.category_id = r.category_id)
            AND ${distance} <= r.search_radius_km
        RETURNING r.id, r.user_id`,
        [requestId, hp.id, hp.current_lat, hp.current_lng]);

      if (!upd.rowCount) {
        const why = (await c.query(
          `SELECT r.status, r.accepted_helper_id, r.expires_at,
                  EXISTS (SELECT 1 FROM helper_categories hc
                           WHERE hc.helper_id = $2 AND hc.category_id = r.category_id) AS has_cat
             FROM help_requests r WHERE r.id = $1`,
          [requestId, hp.id])).rows[0];

        if (!why) throw notFound('REQUEST_NOT_FOUND', 'Request not found');
        if (!why.has_cat) throw forbidden('CATEGORY_MISMATCH', 'This request is outside your services');
        const open = why.status === 'SEARCHING' && !why.accepted_helper_id &&
          (!why.expires_at || new Date(why.expires_at) > new Date());
        if (!open) throw conflict('REQUEST_NOT_AVAILABLE', 'This request was already taken or is no longer open');
        throw conflict('OUT_OF_RANGE', 'This request is outside your service area');
      }

      const requesterId = upd.rows[0].user_id;
      await c.query(
        `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by)
         VALUES ($1, 'SEARCHING', 'ACCEPTED', $2)`, [requestId, helperUserId]);
      await c.query(
        `INSERT INTO conversations (request_id, user_id, helper_user_id) VALUES ($1, $2, $3)`,
        [requestId, requesterId, helperUserId]);
      const note = await createNotification(c, {
        userId: requesterId, type: 'REQUEST_ACCEPTED',
        title: 'Your request has been accepted', data: { requestId },
      });
      return { requesterId, note, helperId: hp.id };
    });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'one_active_job_per_helper') {
      throw conflict('HELPER_BUSY', 'You already have an active job');
    }
    throw err;
  }

  void afterCommit('accept', async () => {
    emitRequestEvent({ userIds: [info.requesterId], requestId }, 'request:accepted',
      { requestId, status: 'ACCEPTED', acceptedAt: new Date().toISOString() });
    closeOffers(requestId, 'TAKEN', info.helperId); // tell the losing helpers
    await pushNotifications([info.note]);
  });

  return getRequest(requestId, { id: helperUserId, role: 'HELPER' });
}

// ---------------------------------------------------------------- reject (private "not interested")
export async function rejectRequest(requestId, helperUserId) {
  const hp = (await query('SELECT id FROM helper_profiles WHERE user_id = $1', [helperUserId])).rows[0];
  if (!hp) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');

  await query(
    `INSERT INTO request_rejections (request_id, helper_id)
     SELECT r.id, $2 FROM help_requests r
      WHERE r.id = $1 AND r.status = 'SEARCHING'
        AND EXISTS (SELECT 1 FROM helper_categories hc
                     WHERE hc.helper_id = $2 AND hc.category_id = r.category_id)
     ON CONFLICT DO NOTHING`,
    [requestId, hp.id]);

  const done = await query(
    'SELECT 1 FROM request_rejections WHERE request_id = $1 AND helper_id = $2', [requestId, hp.id]);
  if (!done.rowCount) throw notFound('REQUEST_NOT_FOUND', 'Request not found');
}

// ---------------------------------------------------------------- cancel
const CANCELLABLE = ['PENDING', 'SEARCHING', 'ACCEPTED', 'ARRIVING'];

export async function cancelRequest(requestId, userId, reason) {
  const info = await withTransaction(async (c) => {
    const r = (await c.query(
      `SELECT r.id, r.status, hp.user_id AS helper_user_id
         FROM help_requests r
         LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
        WHERE r.id = $1 AND r.user_id = $2
          FOR UPDATE OF r`,
      [requestId, userId])).rows[0];
    if (!r) throw notFound('REQUEST_NOT_FOUND', 'Request not found');
    if (!CANCELLABLE.includes(r.status)) {
      throw conflict('CANNOT_CANCEL', `A ${r.status.toLowerCase().replace('_', ' ')} request cannot be cancelled`);
    }

    await c.query(`UPDATE help_requests SET status = 'CANCELLED' WHERE id = $1`, [requestId]);
    await c.query(
      `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2, 'CANCELLED', $3, $4)`,
      [requestId, r.status, userId, reason ?? null]);

    const note = r.helper_user_id
      ? await createNotification(c, {
          userId: r.helper_user_id, type: 'REQUEST_CANCELLED',
          title: 'The request was cancelled by the user', data: { requestId },
        })
      : null;
    return { prevStatus: r.status, helperUserId: r.helper_user_id, note };
  });

  void afterCommit('cancel', async () => {
    emitRequestEvent(
      { userIds: [userId, ...(info.helperUserId ? [info.helperUserId] : [])], requestId },
      'request:cancelled', { requestId, by: 'USER', at: new Date().toISOString() });
    if (['PENDING', 'SEARCHING'].includes(info.prevStatus)) closeOffers(requestId, 'CANCELLED');
    if (info.note) await pushNotifications([info.note]);
  });

  return getRequest(requestId, { id: userId, role: 'USER' });
}

// ---------------------------------------------------------------- job status (helper)
const NEXT_STATUS = { ACCEPTED: 'ARRIVING', ARRIVING: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED' };
const USER_MESSAGE = {
  ARRIVING: 'Your helper is arriving',
  IN_PROGRESS: 'Work on your request has started',
  COMPLETED: 'Your request is complete',
};

export async function updateStatus(requestId, helperUserId, target, note) {
  const info = await withTransaction(async (c) => {
    const hp = (await c.query('SELECT id FROM helper_profiles WHERE user_id = $1', [helperUserId])).rows[0];
    const r = (await c.query(
      `SELECT id, user_id, status, accepted_helper_id FROM help_requests WHERE id = $1 FOR UPDATE`,
      [requestId])).rows[0];
    // 404 for both "missing" and "not your job" so ids can't be probed
    if (!hp || !r || r.accepted_helper_id !== hp.id) {
      throw notFound('REQUEST_NOT_FOUND', 'Request not found');
    }
    if (NEXT_STATUS[r.status] !== target) {
      throw conflict('INVALID_STATUS_TRANSITION', `Cannot move from ${r.status} to ${target}`);
    }

    await c.query(
      `UPDATE help_requests
          SET status = $2::request_status,
              completed_at = CASE WHEN $2::request_status = 'COMPLETED' THEN now() ELSE completed_at END
        WHERE id = $1`,
      [requestId, target]);
    await c.query(
      `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [requestId, r.status, target, helperUserId, note ?? null]);
    const notification = await createNotification(c, {
      userId: r.user_id, type: 'REQUEST_STATUS_CHANGED',
      title: USER_MESSAGE[target], data: { requestId, status: target },
    });
    return { ownerId: r.user_id, notification };
  });

  void afterCommit('status', async () => {
    emitRequestEvent({ userIds: [info.ownerId, helperUserId], requestId }, 'request:status_changed',
      { requestId, status: target, note: note ?? null, at: new Date().toISOString() });
    await pushNotifications([info.notification]);
  });

  return getRequest(requestId, { id: helperUserId, role: 'HELPER' });
}