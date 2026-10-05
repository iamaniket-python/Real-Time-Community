import * as s from '../services/cart.service.js';

const ok = (res, data) => res.json({ success: true, data });

export const get = async (req, res) => ok(res, { cart: await s.getCart(req.user.id) });
export const setItem = async (req, res) => ok(res, { cart: await s.setItem(req.user.id, req.body) });
export const removeItem = async (req, res) =>
  ok(res, { cart: await s.removeItem(req.user.id, req.params.productId) });
export const clear = async (req, res) => ok(res, { cart: await s.clearCart(req.user.id) });