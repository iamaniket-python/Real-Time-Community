import { query, withTransaction } from '../config/db.js';
import { AppError, conflict, notFound } from '../utils/AppError.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { signedUrl } from './upload.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TRANSITIONS = {
  verify: { from: ['PENDING', 'REJECTED', 'SUSPENDED'], to: 'VERIFIED' },
  reject: { from: ['PENDING'], to: 'REJECTED' },
  suspend: { from: ['VERIFIED'], to: 'SUSPENDED' },
};

const audit = (db, adminId, action, targetId, metadata) =>
  db.query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, 'seller_profile', $3::text, $4::jsonb)`,
    [adminId, action, String(targetId), JSON.stringify(metadata ?? {})]);

const checkId = (id) => {
  if (!UUID.test(String(id))) throw notFound('SELLER_NOT_FOUND', 'Seller not found');
};

// Oldest first, keyset pagination: uses seller_admin_idx (verification, created_at, id)
export async function listSellers({ status, limit, cursor }) {
  const n = Number(limit) || 20;
  const cur = cursor ? decodeCursor(cursor) : { ts: null, id: null };
  const { rows } = await query(
    `SELECT sp.id, sp.verification::text AS verification, sp.shop_name, sp.address,
            sp.submitted_at, sp.created_at::text AS cursor_ts,
            u.id AS user_id, u.name, u.email, u.status AS account_status
       FROM seller_profiles sp JOIN users u ON u.id = sp.user_id
      WHERE sp.verification = $1::verification_status
        AND ($2::timestamptz IS NULL OR (sp.created_at, sp.id) > ($2::timestamptz, $3::uuid))
      ORDER BY sp.created_at, sp.id
      LIMIT $4`,
    [status, cur.ts, cur.id, n + 1]);

  const hasMore = rows.length > n;
  const page = hasMore ? rows.slice(0, n) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map((s) => ({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      email: s.email,
      shopName: s.shop_name,
      address: s.address,
      verificationStatus: s.verification,
      accountStatus: s.account_status,
      submittedAt: s.submitted_at,
    })),
    nextCursor: hasMore ? encodeCursor(last.cursor_ts, last.id) : null,
  };
}

export async function getSellerDetail(adminId, sellerId) {
  checkId(sellerId);
  const { rows } = await query(
    `SELECT sp.*, sp.verification::text AS verification_text,
            u.id AS user_id, u.name, u.email, u.status AS account_status,
            to_jsonb(u) ->> 'phone' AS phone
       FROM seller_profiles sp JOIN users u ON u.id = sp.user_id
      WHERE sp.id = $1`, [sellerId]);
  const s = rows[0];
  if (!s) throw notFound('SELLER_NOT_FOUND', 'Seller not found');

  const gallery = (await query(
    'SELECT id, path FROM shop_images WHERE seller_id = $1 ORDER BY position, id', [sellerId])).rows;
  await audit({ query }, adminId, 'SELLER_DETAILS_VIEWED', sellerId, {});

  const url = (p) => (p ? signedUrl(p) : null);
  return {
    id: s.id,
    userId: s.user_id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    accountStatus: s.account_status,
    verificationStatus: s.verification_text,
    isOpen: s.is_open,
    ratingAvg: Number(s.rating_avg),
    ratingCount: s.rating_count,
    shop: {
      name: s.shop_name,
      description: s.description,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      gstNumber: s.gst_number,
      panNumber: s.pan_number,
      aadhaarNumber: s.aadhaar_number,
      submittedAt: s.submitted_at,
    },
    documents: {
      gst: url(s.gst_image_path),
      pan: url(s.pan_image_path),
      aadhaar: url(s.aadhaar_image_path),
    },
    gallery: gallery.map((g) => ({ id: g.id, url: signedUrl(g.path) })),
  };
}

/** action = 'verify' | 'reject' | 'suspend'. sellerId is the seller PROFILE id. */
export async function changeSellerStatus(adminId, sellerId, action, reason) {
  checkId(sellerId);
  const rule = TRANSITIONS[action];
  return withTransaction(async (c) => {
    const { rows } = await c.query(
      `SELECT id, verification::text AS verification,
              (shop_name IS NOT NULL AND address IS NOT NULL AND lat IS NOT NULL
               AND gst_number IS NOT NULL AND pan_number IS NOT NULL
               AND aadhaar_number IS NOT NULL) AS profile_complete,
              (gst_image_path IS NOT NULL AND pan_image_path IS NOT NULL
               AND aadhaar_image_path IS NOT NULL) AS documents_complete
         FROM seller_profiles WHERE id = $1 FOR UPDATE`, [sellerId]);
    const s = rows[0];
    if (!s) throw notFound('SELLER_NOT_FOUND', 'Seller not found');
    if (!rule.from.includes(s.verification)) {
      throw conflict('INVALID_STATE_TRANSITION',
        `Cannot ${action} a seller whose status is ${s.verification}`);
    }
    if (action === 'verify' && (!s.profile_complete || !s.documents_complete)) {
      throw new AppError(422, 'SELLER_INCOMPLETE',
        'The shop profile and all three documents must be complete before verification');
    }

    await c.query('UPDATE seller_profiles SET verification = $2::verification_status WHERE id = $1',
      [sellerId, rule.to]);
    await audit(c, adminId, `SELLER_${action.toUpperCase()}`, sellerId,
      { from: s.verification, to: rule.to, reason: reason ?? null });
    return { sellerId, verificationStatus: rule.to };
  });
}