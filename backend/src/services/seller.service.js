import { query } from '../config/db.js';
import { AppError, notFound } from '../utils/AppError.js';
import { storeImage, deleteStored, signedUrl } from './upload.service.js';
import { mask } from './helper-business.service.js';

const MAX_GALLERY = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Whitelist: the URL type maps to a fixed column, so no user text reaches the SQL
export const DOC_COLUMNS = { gst: 'gst_image_path', pan: 'pan_image_path', aadhaar: 'aadhaar_image_path' };

const ensure = (userId) =>
  query('INSERT INTO seller_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);

const cols = `id, verification::text AS verification, shop_name, description, address, lat, lng,
  gst_number, pan_number, aadhaar_number, gst_image_path, pan_image_path, aadhaar_image_path,
  is_open, rating_avg, rating_count, submitted_at,
  (SELECT count(*)::int FROM shop_images si WHERE si.seller_id = seller_profiles.id) AS gallery_count`;

const toDto = (r) => ({
  id: r.id,
  verification: r.verification,
  shopName: r.shop_name,
  description: r.description,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  gstNumber: r.gst_number,
  aadhaarMasked: mask(r.aadhaar_number, 4),
  panMasked: mask(r.pan_number, 2),
  isOpen: r.is_open,
  ratingAvg: Number(r.rating_avg),
  ratingCount: r.rating_count,
  submittedAt: r.submitted_at,
  galleryCount: r.gallery_count,
  profileComplete: !!(r.shop_name && r.address && r.lat != null && r.gst_number
    && r.pan_number && r.aadhaar_number),
  documentsComplete: !!(r.gst_image_path && r.pan_image_path && r.aadhaar_image_path),
});

export async function getMine(userId) {
  await ensure(userId);
  const { rows } = await query(`SELECT ${cols} FROM seller_profiles WHERE user_id = $1`, [userId]);
  return toDto(rows[0]);
}

export async function saveProfile(userId, b) {
  await ensure(userId);
  await query(
    `UPDATE seller_profiles
        SET shop_name = $2, description = $3, address = $4, lat = $5, lng = $6,
            gst_number = $7, pan_number = $8, aadhaar_number = $9, submitted_at = now(),
            verification = CASE WHEN verification = 'REJECTED' THEN 'PENDING' ELSE verification END
      WHERE user_id = $1`,
    [userId, b.shopName, b.description ?? null, b.address, b.lat, b.lng,
      b.gstNumber.toUpperCase(), b.panNumber.toUpperCase(), b.aadhaarNumber.replace(/\s/g, '')]);
  return getMine(userId);
}

export async function setOpen(userId, isOpen) {
  await ensure(userId);
  await query('UPDATE seller_profiles SET is_open = $2 WHERE user_id = $1', [userId, isOpen]);
  return getMine(userId);
}

// ------------------------------------------------------------ documents
export async function getDocuments(userId) {
  await ensure(userId);
  const { rows } = await query(
    `SELECT gst_image_path, pan_image_path, aadhaar_image_path FROM seller_profiles WHERE user_id = $1`,
    [userId]);
  const r = rows[0];
  const url = (p) => (p ? signedUrl(p) : null);
  return { gst: url(r.gst_image_path), pan: url(r.pan_image_path), aadhaar: url(r.aadhaar_image_path) };
}

export async function saveDocument(userId, type, file) {
  const col = DOC_COLUMNS[type];
  if (!col) throw new AppError(422, 'INVALID_DOCUMENT_TYPE', 'Type must be gst, pan or aadhaar');
  await ensure(userId);

  const old = (await query(`SELECT ${col} AS p FROM seller_profiles WHERE user_id = $1`, [userId])).rows[0];
  const stored = await storeImage(file.buffer, file.detected.ext);
  try {
    await query(
      `UPDATE seller_profiles SET ${col} = $2,
              verification = CASE WHEN verification = 'REJECTED' THEN 'PENDING' ELSE verification END
        WHERE user_id = $1`,
      [userId, stored.path]);
  } catch (e) {
    await deleteStored(stored.path);
    throw e;
  }
  if (old?.p) await deleteStored(old.p);
  return getDocuments(userId);
}

// ------------------------------------------------------------ gallery
export async function getGallery(userId) {
  await ensure(userId);
  const { rows } = await query(
    `SELECT si.id, si.path FROM shop_images si
       JOIN seller_profiles sp ON sp.id = si.seller_id
      WHERE sp.user_id = $1 ORDER BY si.position, si.id`, [userId]);
  return rows.map((r) => ({ id: r.id, url: signedUrl(r.path) }));
}

export async function addGalleryImage(userId, file) {
  await ensure(userId);
  const sp = (await query('SELECT id FROM seller_profiles WHERE user_id = $1', [userId])).rows[0];
  const stored = await storeImage(file.buffer, file.detected.ext);
  try {
    // One statement: the limit check and the insert cannot be split by a concurrent upload
    const ins = await query(
      `INSERT INTO shop_images (seller_id, path, position)
       SELECT $1::uuid, $2,
              COALESCE((SELECT max(position) + 1 FROM shop_images WHERE seller_id = $1::uuid), 0)
        WHERE (SELECT count(*) FROM shop_images WHERE seller_id = $1::uuid) < $3
    RETURNING id`,
      [sp.id, stored.path, MAX_GALLERY]);
    if (!ins.rowCount) {
      await deleteStored(stored.path);
      throw new AppError(422, 'GALLERY_FULL', `A shop can have at most ${MAX_GALLERY} gallery images`);
    }
  } catch (e) {
    if (!(e instanceof AppError)) await deleteStored(stored.path);
    throw e;
  }
  return getGallery(userId);
}

export async function removeGalleryImage(userId, imageId) {
  if (!UUID.test(imageId)) throw notFound('IMAGE_NOT_FOUND', 'Image not found');
  const { rows } = await query(
    `DELETE FROM shop_images si USING seller_profiles sp
      WHERE si.id = $1 AND si.seller_id = sp.id AND sp.user_id = $2
  RETURNING si.path`, [imageId, userId]);
  if (!rows[0]) throw notFound('IMAGE_NOT_FOUND', 'Image not found');
  await deleteStored(rows[0].path);
  return getGallery(userId);
}