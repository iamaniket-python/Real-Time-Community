import { query } from '../config/db.js';
import { AppError, notFound } from '../utils/AppError.js';
import { storeImage, deleteStored, signedUrl } from './upload.service.js';

// Whitelist: the URL type maps to a fixed column, so no user text reaches the SQL
export const DOC_COLUMNS = {
  aadhaar: 'aadhaar_image_path',
  pan: 'pan_image_path',
  shop: 'shop_image_path',
};

const toDto = (r) => ({
  aadhaar: r.aadhaar_image_path ? signedUrl(r.aadhaar_image_path) : null,
  pan: r.pan_image_path ? signedUrl(r.pan_image_path) : null,
  shop: r.shop_image_path ? signedUrl(r.shop_image_path) : null,
});

const select = 'SELECT aadhaar_image_path, pan_image_path, shop_image_path FROM helper_profiles';

export async function getMyDocuments(userId) {
  const { rows } = await query(`${select} WHERE user_id = $1`, [userId]);
  if (!rows[0]) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');
  return toDto(rows[0]);
}

export async function saveDocument(userId, type, file) {
  const col = DOC_COLUMNS[type];
  if (!col) throw new AppError(422, 'INVALID_DOCUMENT_TYPE', 'Type must be aadhaar, pan or shop');

  const old = (await query(`SELECT ${col} AS p FROM helper_profiles WHERE user_id = $1`, [userId])).rows[0];
  if (!old) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');

  const stored = await storeImage(file.buffer, file.detected.ext);
  try {
    await query(
      `UPDATE helper_profiles SET ${col} = $2,
              verification = CASE WHEN verification = 'REJECTED' THEN 'PENDING' ELSE verification END
        WHERE user_id = $1`,
      [userId, stored.path]);
  } catch (e) {
    await deleteStored(stored.path);
    throw e;
  }
  if (old.p) await deleteStored(old.p);
  return getMyDocuments(userId);
}