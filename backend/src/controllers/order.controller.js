import * as s from '../services/order.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const list = async (req, res) => ok(res, await s.listMyOrders(req.user.id, req.query));
export const detail = async (req, res) => ok(res, await s.getMyOrder(req.user.id, req.params.id));