import { query, withTransaction } from '../config/db.js';
import { conflict, notFound } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

const page = (rows, limit) => {
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
};

export async function listReports({ status, limit, cursor }) {
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT rp.id, rp.request_id, rp.reason, rp.details, rp.status::text AS status,
            rp.created_at, rp.created_at::text AS cursor_ts,
            rp.reporter_id, rr.name AS reporter_name,
            rp.reported_user_id, ru.name AS reported_name
       FROM reports rp
       JOIN users rr ON rr.id = rp.reporter_id
       JOIN users ru ON ru.id = rp.reported_user_id
      WHERE ($1::text IS NULL OR rp.status::text = $1)
        AND ($2::timestamptz IS NULL OR (rp.created_at, rp.id) < ($2::timestamptz, $3::uuid))
      ORDER BY rp.created_at DESC, rp.id DESC
      LIMIT $4`,
    [status ?? null, cur.ts, cur.id, limit + 1]);

  const { items, hasMore } = page(rows, limit);
  const last = items[items.length - 1];
  return {
    items: items.map((r) => ({
      id: r.id,
      requestId: r.request_id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.created_at,
      reporter: { id: r.reporter_id, name: r.reporter_name },
      reported: { id: r.reported_user_id, name: r.reported_name },
    })),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

/** Changes a report's status. The allowed values come from the report_status enum itself. */
export async function updateReportStatus(adminId, reportId, status, note) {
  return withTransaction(async (c) => {
    const { rows } = await c.query(
      'SELECT id, status::text AS status FROM reports WHERE id = $1 FOR UPDATE', [reportId]);
    const r = rows[0];
    if (!r) throw notFound('REPORT_NOT_FOUND', 'Report not found');

    const allowed = (await c.query(
      'SELECT unnest(enum_range(NULL::report_status))::text AS s')).rows.map((x) => x.s);
    if (!allowed.includes(status)) {
      throw conflict('INVALID_REPORT_STATUS', `Status must be one of: ${allowed.join(', ')}`);
    }
    if (r.status === status) throw conflict('ALREADY_IN_STATUS', `Report is already ${status}`);

    await c.query('UPDATE reports SET status = $2::report_status WHERE id = $1', [reportId, status]);
    await c.query(
      `INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
       VALUES ($1, 'REPORT_STATUS_CHANGE', 'report', $2, $3::jsonb)`,
      [adminId, reportId, JSON.stringify({ from: r.status, to: status, note: note ?? null })]);
    return { reportId, status };
  });
}

export async function listAuditLog({ action, limit, cursor }) {
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT a.id::text AS id, a.action, a.target_type, a.target_id::text AS target_id,
            a.details, a.created_at, a.created_at::text AS cursor_ts,
            a.admin_id, u.name AS admin_name
       FROM admin_actions a LEFT JOIN users u ON u.id = a.admin_id
      WHERE ($1::text IS NULL OR a.action = $1)
        AND ($2::timestamptz IS NULL OR (a.created_at, a.id::text) < ($2::timestamptz, $3::text))
      ORDER BY a.created_at DESC, a.id::text DESC
      LIMIT $4`,
    [action ?? null, cur.ts, cur.id, limit + 1]);

  const { items, hasMore } = page(rows, limit);
  const last = items[items.length - 1];
  return {
    items: items.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.target_type,
      targetId: a.target_id,
      details: a.details,
      createdAt: a.created_at,
      admin: { id: a.admin_id, name: a.admin_name },
    })),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}