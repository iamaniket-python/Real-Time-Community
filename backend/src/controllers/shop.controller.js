import * as s from '../services/shop.service.js';

const ok = (res, data) => res.json({ success: true, data });

export const nearby = async (req, res) => ok(res, await s.nearbyShops(req.query));
export const one = async (req, res) => ok(res, { shop: await s.getShop(req.params.id) });