import * as s from '../services/admin-seller.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// GET /api/admin/sellers?status=&limit=&cursor=  (oldest first; status defaults to PENDING)
export const list = async (req, res) =>
  ok(res, await s.listSellers({
    status: req.query.status ?? 'PENDING',
    limit: req.query.limit,
    cursor: req.query.cursor,
  }));

// GET /api/admin/sellers/:id  (:id is the seller PROFILE id; every view is audit-logged)
export const detail = async (req, res) =>
  ok(res, await s.getSellerDetail(req.user.id, req.params.id));

// POST /api/admin/sellers/:id/verify | reject | suspend
export const action = (name) => async (req, res) =>
  ok(res, await s.changeSellerStatus(req.user.id, req.params.id, name, req.body?.reason));