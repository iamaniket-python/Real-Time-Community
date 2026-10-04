import { query } from '../config/db.js';
import { notFound } from '../utils/AppError.js';
import { signedUrl } from './upload.service.js';
import { mask } from './helper-business.service.js';

const SHOWN = ['ACCEPTED', 'ARRIVING', 'IN_PROGRESS', 'COMPLETED'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAssignedHelper(requestId, viewer) {
  if (!UUID.test(requestId)) throw notFound('REQUEST_NOT_FOUND', 'Request not found');
  const { rows } = await query(
    `SELECT r.user_id, r.status::text AS status,
            hp.id, hp.rating_avg, hp.rating_count, hp.business_name, hp.business_address,
            hp.experience_years, hp.gst_number, hp.aadhaar_number, hp.pan_number,
            hp.shop_image_path, u.name, to_jsonb(u) ->> 'phone' AS phone,
            COALESCE((SELECT json_agg(c.name ORDER BY c.id)
                        FROM helper_categories hc JOIN categories c ON c.id = hc.category_id
                       WHERE hc.helper_id = hp.id), '[]'::json) AS categories
       FROM help_requests r
       JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
       JOIN users u ON u.id = hp.user_id
      WHERE r.id = $1`,
    [requestId]);
  const h = rows[0];
  const allowed = h && (viewer.role === 'ADMIN' || h.user_id === viewer.id);
  if (!allowed || !SHOWN.includes(h.status)) {
    throw notFound('HELPER_NOT_ASSIGNED', 'No helper details available for this request');
  }
  return {
    id: h.id,
    name: h.name,
    phone: h.phone,
    ratingAvg: Number(h.rating_avg),
    ratingCount: h.rating_count,
    categories: h.categories,
    business: {
      name: h.business_name,
      address: h.business_address,
      experienceYears: h.experience_years,
      gstNumber: h.gst_number,
      aadhaarMasked: mask(h.aadhaar_number, 4),
      panMasked: mask(h.pan_number, 2),
      shopImage: h.shop_image_path ? signedUrl(h.shop_image_path) : null,
    },
  };
}