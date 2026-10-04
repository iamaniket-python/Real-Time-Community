import * as s from '../services/admin-helper-detail.service.js';

export const detail = async (req, res) =>
  res.json({
    success: true,
    data: { helper: await s.getHelperDetail(req.user.id, req.params.id) },
  });