import { pool, withTransaction } from '../config/db.js';
import { conflict, notFound } from '../utils/AppError.js';
import { storeImage, deleteStored, signedUrl } from './upload.service.js';

const EDITABLE = ['PENDING', 'SEARCHING', 'ACCEPTED', 'ARRIVING', 'IN_PROGRESS'];

const notFoundRequest = () => notFound('REQUEST_NOT_FOUND', 'Request not found');

/** Owner attaches or replaces the image. file = { buffer, detected } from uploadImage. */
export async function setRequestImage(userId, requestId, file) {
  let newPath = null;
  try {
    const oldPath = await withTransaction(async (c) => {
      const { rows } = await c.query(
        'SELECT status, image_url FROM help_requests WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [requestId, userId]);
      const r = rows[0];
      if (!r) throw notFoundRequest();
      if (!EDITABLE.includes(r.status)) throw conflict('REQUEST_CLOSED', 'This request is closed');

      const stored = await storeImage(file.buffer, file.detected.ext);
      newPath = stored.path;
      await c.query('UPDATE help_requests SET image_url = $2 WHERE id = $1', [requestId, newPath]);
      return r.image_url;
    });
    if (oldPath) await deleteStored(oldPath); // after commit
    return { imageUrl: signedUrl(newPath) };
  } catch (err) {
    if (newPath) await deleteStored(newPath); // no orphan file if the write or commit failed
    throw err;
  }
}

/** Owner removes the image. Idempotent: no image is not an error. */
export async function removeRequestImage(userId, requestId) {
  const oldPath = await withTransaction(async (c) => {
    const { rows } = await c.query(
      'SELECT status, image_url FROM help_requests WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [requestId, userId]);
    const r = rows[0];
    if (!r) throw notFoundRequest();
    if (!EDITABLE.includes(r.status)) throw conflict('REQUEST_CLOSED', 'This request is closed');
    await c.query('UPDATE help_requests SET image_url = NULL WHERE id = $1', [requestId]);
    return r.image_url;
  });
  if (oldPath) await deleteStored(oldPath);
  return { removed: Boolean(oldPath) };
}

/** Owner, accepted helper or admin. Everyone else gets the same 404 as a missing image. */
export async function getRequestImageUrl(user, requestId) {
  const { rows } = await pool.query(
    `SELECT r.user_id, r.image_url, hp.user_id AS helper_user_id
       FROM help_requests r
       LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
      WHERE r.id = $1`, [requestId]);
  const r = rows[0];
  const allowed = r && (r.user_id === user.id || r.helper_user_id === user.id || user.role === 'ADMIN');
  if (!allowed || !r.image_url) throw notFound('IMAGE_NOT_FOUND', 'Image not found');
  return { imageUrl: signedUrl(r.image_url), expiresInSeconds: 300 };
}