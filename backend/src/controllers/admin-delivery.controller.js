import * as s from '../services/admin-delivery.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// GET /api/admin/delivery-partners?status=&limit=&cursor=  (oldest first; status defaults to PENDING)
export const list = async (req, res) =>
  ok(res, await s.listPartners({
    status: req.query.status ?? 'PENDING',
    limit: req.query.limit,
    cursor: req.query.cursor,
  }));

// GET /api/admin/delivery-partners/:id  (:id is the delivery_partners id; every view is audit-logged)
export const detail = async (req, res) =>
  ok(res, await s.getPartnerDetail(req.user.id, req.params.id));

// POST /api/admin/delivery-partners/:id/verify | reject | suspend
export const action = (name) => async (req, res) =>
  ok(res, await s.changePartnerStatus(req.user.id, req.params.id, name, req.body?.reason));