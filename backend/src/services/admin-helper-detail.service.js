import { query } from '../config/db.js';
import { notFound } from '../utils/AppError.js';
import { signedUrl } from './upload.service.js';

export async function getHelperDetail(adminId, helperId) {
  const { rows } = await query(
    `SELECT hp.id, hp.verification::text AS verification, hp.bio, hp.is_available,
            hp.rating_avg, hp.rating_count, hp.business_name, hp.business_address,
            hp.experience_years, hp.gst_number, hp.aadhaar_number, hp.pan_number,
            hp.business_submitted_at, hp.aadhaar_image_path, hp.pan_image_path, hp.shop_image_path,
            u.id AS user_id, u.name, u.email, u.status AS account_status,
            to_jsonb(u) ->> 'phone' AS phone,
            COALESCE((SELECT json_agg(c.name ORDER BY c.id)
                        FROM helper_categories hc JOIN categories c ON c.id = hc.category_id
                       WHERE hc.helper_id = hp.id), '[]'::json) AS categories
       FROM helper_profiles hp JOIN users u ON u.id = hp.user_id
      WHERE hp.id::text = $1`,
    [String(helperId)]);
  const h = rows[0];
  if (!h) throw notFound('HELPER_NOT_FOUND', 'Helper not found');

  await query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata)
     VALUES ($1, 'HELPER_DETAILS_VIEWED', 'helper_profile', $2::text, '{}'::jsonb)`,
    [adminId, String(h.id)]);

  const url = (p) => (p ? signedUrl(p) : null);
  return {
    id: h.id,
    userId: h.user_id,
    name: h.name,
    email: h.email,
    phone: h.phone,
    accountStatus: h.account_status,
    verificationStatus: h.verification,
    isAvailable: h.is_available,
    ratingAvg: Number(h.rating_avg),
    ratingCount: h.rating_count,
    categories: h.categories,
    business: {
      name: h.business_name,
      address: h.business_address,
      experienceYears: h.experience_years,
      gstNumber: h.gst_number,
      aadhaarNumber: h.aadhaar_number,
      panNumber: h.pan_number,
      submittedAt: h.business_submitted_at,
    },
    documents: {
      aadhaar: url(h.aadhaar_image_path),
      pan: url(h.pan_image_path),
      shop: url(h.shop_image_path),
    },
  };
}