import * as s from '../services/helper-business.service.js';

export const get = async (req, res) =>
  res.json({ success: true, data: { business: await s.getBusiness(req.user.id) } });

export const save = async (req, res) =>
  res.json({ success: true, data: { business: await s.saveBusiness(req.user.id, req.body) } });