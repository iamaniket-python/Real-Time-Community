import { createReport } from '../services/report.service.js';

/** POST /api/requests/:id/report */
export async function create(req, res) {
  const data = await createReport(req.user.id, req.params.id, req.body);
  res.status(201).json({ success: true, data });
}