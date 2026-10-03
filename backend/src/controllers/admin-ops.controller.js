import * as svc from '../services/admin-ops.service.js';

/** GET /api/admin/categories */
export async function listCategories(_req, res) {
  res.json({ success: true, data: await svc.listCategories() });
}

/** POST /api/admin/categories */
export async function createCategory(req, res) {
  res.status(201).json({ success: true, data: await svc.createCategory(req.user.id, req.body) });
}

/** PATCH /api/admin/categories/:id */
export async function updateCategory(req, res) {
  res.json({ success: true, data: await svc.updateCategory(req.user.id, req.params.id, req.body) });
}

/** GET /api/admin/requests/active */
export async function activeRequests(req, res) {
  res.json({ success: true, data: await svc.listActiveRequests(req.query) });
}

/** GET /api/admin/stats */
export async function stats(_req, res) {
  res.json({ success: true, data: await svc.getStats() });
}