import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError, conflict, notFound, forbidden } from '../utils/AppError.js';

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

// ---- cursor helpers: timestamp kept as TEXT to preserve microseconds ----
const encodeCursor = (ts, id) => Buffer.from(`${ts}|${id}`).toString('base64url');
const TS_RE = /^\d{4}-\d{2}-\d{2}[ T][0-9:.+\-Z]+$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;
function decodeCursor(cursor) {
  try {
    const [ts, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    if (!TS_RE.test(ts) || !UUID_RE.test(id)) throw new Error('bad');
    return { ts, id };
  } catch {
    throw new AppError(400, 'INVALID_CURSOR', 'Invalid pagination cursor');
  }
}

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
         input.lat, input.lng, env.REQUEST_SEARCH_RADIUS_KM, input.idempotencyKey ?? null],
      );

      if (!ins.rowCount) {
        // Same idempotency key sent again: return the original request
        const prev = await c.query(
          'SELECT id FROM help_requests WHERE user_id = $1 AND idempotency_key = $2',
          [userId, input.idempotencyKey],
        );
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

  const { rows } = await query(`SELECT ${SELECT} ${FROM} WHERE r.id = $1`, [result.id]);
  return { request: toDto(rows[0]), created: result.created };
}

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

export async function acceptRequest(requestId, helperUserId) {
  try {
    await withTransaction(async (c) => {
      const hp = (await c.query(
        'SELECT id, verification, is_available FROM helper_profiles WHERE user_id = $1',
        [helperUserId])).rows[0];
      if (!hp) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');
      if (hp.verification !== 'VERIFIED') throw forbidden('HELPER_NOT_VERIFIED', 'Your profile is not verified');
      if (!hp.is_available) throw new AppError(409, 'HELPER_OFFLINE', 'Go online to accept requests');

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
        RETURNING r.id, r.user_id`,
        [requestId, hp.id]);

      if (!upd.rowCount) {
        // Work out why, so the helper sees a useful error
        const why = (await c.query(
          `SELECT EXISTS (SELECT 1 FROM helper_categories hc
                           WHERE hc.helper_id = $2 AND hc.category_id = r.category_id) AS has_cat
             FROM help_requests r WHERE r.id = $1`,
          [requestId, hp.id])).rows[0];
        if (!why) throw notFound('REQUEST_NOT_FOUND', 'Request not found');
        if (!why.has_cat) throw forbidden('CATEGORY_MISMATCH', 'This request is outside your services');
        throw conflict('REQUEST_NOT_AVAILABLE', 'This request was already taken or is no longer open');
      }

      const { user_id: requesterId } = upd.rows[0];
      await c.query(
        `INSERT INTO request_status_history (request_id, from_status, to_status, changed_by)
         VALUES ($1, 'SEARCHING', 'ACCEPTED', $2)`, [requestId, helperUserId]);
      await c.query(
        `INSERT INTO conversations (request_id, user_id, helper_user_id) VALUES ($1, $2, $3)`,
        [requestId, requesterId, helperUserId]);
      await c.query(
        `INSERT INTO notifications (user_id, type, title, data)
         VALUES ($1, 'REQUEST_ACCEPTED', 'Your request has been accepted', $2)`,
        [requesterId, JSON.stringify({ requestId })]);
    });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'one_active_job_per_helper') {
      throw conflict('HELPER_BUSY', 'You already have an active job');
    }
    throw err;
  }
  return getRequest(requestId, { id: helperUserId, role: 'HELPER' });
}

export async function listMyRequests(userId, { limit, cursor, status }) {
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT ${SELECT}, r.created_at::text AS cursor_ts ${FROM}
      WHERE r.user_id = $1
        AND ($2::request_status IS NULL OR r.status = $2::request_status)
        AND ($3::timestamptz IS NULL OR (r.created_at, r.id) < ($3::timestamptz, $4::uuid))
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $5`,
    [userId, status ?? null, cur.ts, cur.id, limit + 1],
  );

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(toDto),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}