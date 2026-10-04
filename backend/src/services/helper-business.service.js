import { query } from '../config/db.js';
import { notFound } from '../utils/AppError.js';

export const mask = (v, keep) => (v ? 'X'.repeat(Math.max(v.length - keep, 0)) + v.slice(-keep) : null);

const toDto = (r) => ({
  businessName: r.business_name,
  businessAddress: r.business_address,
  experienceYears: r.experience_years,
  gstNumber: r.gst_number,
  aadhaarMasked: mask(r.aadhaar_number, 4),
  panMasked: mask(r.pan_number, 2),
  submittedAt: r.business_submitted_at,
  complete: !!(r.business_name && r.gst_number && r.aadhaar_number && r.pan_number),
});

const cols = `business_name, business_address, experience_years, gst_number,
              aadhaar_number, pan_number, business_submitted_at`;

export async function getBusiness(userId) {
  const { rows } = await query(`SELECT ${cols} FROM helper_profiles WHERE user_id = $1`, [userId]);
  if (!rows[0]) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');
  return toDto(rows[0]);
}

export async function saveBusiness(userId, b) {
  const { rows } = await query(
    `UPDATE helper_profiles
        SET business_name = $2, business_address = $3, experience_years = $4,
            gst_number = $5, aadhaar_number = $6, pan_number = $7,
            business_submitted_at = now(),
            verification = CASE WHEN verification = 'REJECTED' THEN 'PENDING' ELSE verification END
      WHERE user_id = $1
  RETURNING ${cols}`,
    [userId, b.businessName, b.businessAddress, b.experienceYears,
      b.gstNumber.toUpperCase(), b.aadhaarNumber.replace(/\s/g, ''), b.panNumber.toUpperCase()]);
  if (!rows[0]) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');
  return toDto(rows[0]);
}