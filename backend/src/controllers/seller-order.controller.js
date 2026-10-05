import * as s from '../services/seller-order.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const list = async (req, res) => ok(res, await s.listShopOrders(req.user.id, req.query));
export const detail = async (req, res) => ok(res, await s.getShopOrder(req.user.id, req.params.id));

const move = (action) => async (req, res) =>
  ok(res, await s.moveOrder(req.user.id, req.params.id, action));

export const confirm = move('confirm');
export const ready = move('ready');
export const complete = move('complete');