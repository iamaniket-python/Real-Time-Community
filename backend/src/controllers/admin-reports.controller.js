import * as svc from '../services/admin-reports.service.js';

/** GET /api/admin/reports */
export async function reports(req, res) {
  res.json({ success: true, data: await svc.listReports(req.query) });
}

/** PATCH /api/admin/reports/:id */
export async function updateReport(req, res) {
  const { status, note } = req.body;
  res.json({ success: true, data: await svc.updateReportStatus(req.user.id, req.params.id, status, note) });
}

/** GET /api/admin/audit-log */
export async function auditLog(req, res) {
  res.json({ success: true, data: await svc.listAuditLog(req.query) });
}