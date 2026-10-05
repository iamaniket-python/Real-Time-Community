import * as s from '../services/product.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const listMine = async (req, res) => ok(res, await s.listMine(req.user.id, req.query));
export const create = async (req, res) => ok(res, { product: await s.create(req.user.id, req.body) }, 201);
export const update = async (req, res) =>
  ok(res, { product: await s.update(req.user.id, req.params.id, req.body) });
export const remove = async (req, res) => ok(res, await s.remove(req.user.id, req.params.id));
export const setImage = async (req, res) =>
  ok(res, { product: await s.setImage(req.user.id, req.params.id, req.file) });

export const shopProducts = async (req, res) =>
  ok(res, await s.listForShop(req.params.id, req.query));