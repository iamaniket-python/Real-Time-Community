import { setRequestImage, removeRequestImage, getRequestImageUrl } from '../services/request-image.service.js';

/** POST /api/requests/:id/image */
export async function upload(req, res) {
  const data = await setRequestImage(req.user.id, req.params.id, req.file);
  res.status(201).json({ success: true, data });
}

/** DELETE /api/requests/:id/image */
export async function remove(req, res) {
  res.json({ success: true, data: await removeRequestImage(req.user.id, req.params.id) });
}

/** GET /api/requests/:id/image-url */
export async function url(req, res) {
  res.json({ success: true, data: await getRequestImageUrl(req.user, req.params.id) });
}