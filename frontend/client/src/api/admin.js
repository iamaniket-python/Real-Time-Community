import { api } from './client';

export const listHelpers = (status) =>
  api(`/admin/helpers?status=${encodeURIComponent(status)}`);
export const helperAction = (id, action, reason) =>
  api(`/admin/helpers/${id}/${action}`, { method: 'POST', body: { reason } });

export const listReports = () => api('/admin/reports');
export const updateReport = (id, status, note) =>
  api(`/admin/reports/${id}`, { method: 'PATCH', body: { status, note } });

export const blockUser = (id) => api(`/admin/users/${id}/block`, { method: 'POST' });
export const unblockUser = (id) => api(`/admin/users/${id}/unblock`, { method: 'POST' });

export const listAdminCategories = () => api('/admin/categories');
export const createCategory = (name) =>
  api('/admin/categories', { method: 'POST', body: { name } });
export const updateCategory = (id, patch) =>
  api(`/admin/categories/${id}`, { method: 'PATCH', body: patch });

export const getStats = () => api('/admin/stats');
export const getActiveRequests = () => api('/admin/requests/active');
export const getAuditLog = (cursor) =>
  api(`/admin/audit-log${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);