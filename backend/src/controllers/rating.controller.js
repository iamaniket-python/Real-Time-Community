import { rateRequest, listHelperRatings } from '../services/rating.service.js';

/** POST /api/requests/:id/rating */
export async function create(req, res) {
  const data = await rateRequest(req.user.id, req.params.id, req.body);
  res.status(201).json({ success: true, data });
}

/** GET /api/helpers/:id/ratings */
export async function list(req, res) {
  res.json({ success: true, data: await listHelperRatings(req.params.id, req.query) });
}