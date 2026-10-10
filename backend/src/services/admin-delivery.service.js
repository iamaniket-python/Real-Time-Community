import { query, withTransaction } from '../config/db.js';
import { AppError, conflict, notFound } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRANSITIONS = {
  verify: { from: ['PENDING', 'REJECTED', 'SUSPENDED'], to: 'VERIFIED' },
  reject: { from: ['PENDING'], to: 'REJECTED' },
  suspend: { from: ['VERIFIED'], to: 'SUSPENDED' },
};

const audit = (db, adminId, action, targetId, metadata) =>
  db.query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, 'delivery_partner', $3::text, $4::jsonb)`,
    [adminId, action, String(targetId), JSON.stringify(metadata ?? {})]);

const checkId = (id) => {
  if (!UUID.test(String(id))) throw notFound('PARTNER_NOT_FOUND', 'Delivery partner not found');
};

// Oldest first, keyset pagination: uses delivery_partners_admin_idx (verification, created_at, id)
export async function listPartners({ status, limit, cursor }) {
  const n = Number(limit) || 20;
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT dp.id, dp.verification::text AS verification, dp.vehicle_type, dp.created_at::text AS cursor_ts,
            u.id AS user_id, u.name, u.email, u.phone, u.status AS account_status
       FROM delivery_partners dp JOIN users u ON u.id = dp.user_id
      WHERE dp.verification = $1::verification_status
        AND ($2::timestamptz IS NULL OR (dp.created_at, dp.id) > ($2::timestamptz, $3::uuid))
      ORDER BY dp.created_at, dp.id
      LIMIT $4`,
    [status, cur.ts, cur.id, n + 1]);

  const hasMore = rows.length > n;
  const page = hasMore ? rows.slice(0, n) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map((p) => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      vehicleType: p.vehicle_type,
      verificationStatus: p.verification,
      accountStatus: p.account_status,
    })),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

export async function getPartnerDetail(adminId, partnerId) {
  checkId(partnerId);
  const { rows } = await query(
    `SELECT dp.id, dp.verification::text AS verification, dp.vehicle_type, dp.vehicle_number,
            dp.is_available, dp.rating_avg, dp.rating_count, dp.created_at,
            u.id AS user_id, u.name, u.email, u.phone, u.avatar_url, u.status AS account_status
       FROM delivery_partners dp JOIN users u ON u.id = dp.user_id
      WHERE dp.id = $1`, [partnerId]);
  const p = rows[0];
  if (!p) throw notFound('PARTNER_NOT_FOUND', 'Delivery partner not found');

  await audit({ query }, adminId, 'DELIVERY_PARTNER_DETAILS_VIEWED', partnerId, {});
  return {
    id: p.id,
    userId: p.user_id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    avatarUrl: p.avatar_url,
    accountStatus: p.account_status,
    verificationStatus: p.verification,
    vehicleType: p.vehicle_type,
    vehicleNumber: p.vehicle_number,
    isAvailable: p.is_available,
    ratingAvg: Number(p.rating_avg),
    ratingCount: p.rating_count,
    createdAt: p.created_at,
  };
}

/** action = 'verify' | 'reject' | 'suspend'. partnerId is the delivery_partners id. */
export async function changePartnerStatus(adminId, partnerId, action, reason) {
  checkId(partnerId);
  const rule = TRANSITIONS[action];
  return withTransaction(async (c) => {
    const { rows } = await c.query(
      `SELECT dp.id, dp.verification::text AS verification, dp.vehicle_type, u.phone
         FROM delivery_partners dp JOIN users u ON u.id = dp.user_id
        WHERE dp.id = $1 FOR UPDATE OF dp`, [partnerId]);
    const p = rows[0];
    if (!p) throw notFound('PARTNER_NOT_FOUND', 'Delivery partner not found');
    if (!rule.from.includes(p.verification)) {
      throw conflict('INVALID_STATE_TRANSITION',
        `Cannot ${action} a delivery partner whose status is ${p.verification}`);
    }
    if (action === 'verify' && (!p.phone || !p.vehicle_type)) {
      throw new AppError(422, 'PARTNER_INCOMPLETE',
        'The partner needs a phone number and a vehicle type before verification');
    }

    // A partner who is not verified can never stay "available"
    await c.query(
      `UPDATE delivery_partners
          SET verification = $2::verification_status,
              is_available = CASE WHEN $2::text = 'VERIFIED' THEN is_available ELSE false END
        WHERE id = $1`,
      [partnerId, rule.to]);
    await audit(c, adminId, `DELIVERY_PARTNER_${action.toUpperCase()}`, partnerId,
      { from: p.verification, to: rule.to, reason: reason ?? null });
    return { partnerId, verificationStatus: rule.to };
  });
}