import * as s from '../services/checkout.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const checkout = async (req, res) => ok(res, await s.checkout(req.user.id, req.body), 201);
export const payment = async (req, res) => ok(res, await s.paymentFor(req.user.id, req.params.id));
export const verify = async (req, res) =>
  ok(res, await s.verifyPayment(req.user.id, req.params.id, req.body));