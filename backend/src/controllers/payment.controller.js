import * as s from '../services/checkout.service.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// GET-style helper: details to (re)open the payment window for an unpaid order
export const payment = async (req, res) => ok(res, await s.paymentFor(req.user.id, req.params.id));

// After the browser reports success: checks the signature, then marks the order PLACED
export const verify = async (req, res) =>
  ok(res, await s.verifyPayment(req.user.id, req.params.id, req.body));