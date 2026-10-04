import * as s from '../services/admin-chat.service.js';

export const open = async (req, res) =>
  res.json({ success: true, data: await s.openHelperChat(req.user.id, req.params.id) });