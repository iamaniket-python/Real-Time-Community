import * as s from '../services/request-helper.service.js';

export const get = async (req, res) =>
  res.json({ success: true, data: { helper: await s.getAssignedHelper(req.params.id, req.user) } });