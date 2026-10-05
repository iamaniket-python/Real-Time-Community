import * as s from '../services/review.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const create = async (req, res) =>
  ok(res, await s.createReview(req.user.id, req.params.id, req.body), 201);
export const list = async (req, res) =>
  ok(res, await s.listShopReviews(req.params.id, req.query));