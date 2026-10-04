import * as s from '../services/helper-documents.service.js';

export const list = async (req, res) =>
  res.json({ success: true, data: { documents: await s.getMyDocuments(req.user.id) } });

export const upload = async (req, res) =>
  res.json({
    success: true,
    data: { documents: await s.saveDocument(req.user.id, req.params.type, req.file) },
  });