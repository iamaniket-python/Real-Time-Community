import { api } from './client';

export const getMyHelper = () => api('/helpers/me');
export const setHelperCategories = (categoryIds) =>
  api('/helpers/categories', { method: 'PUT', body: { categoryIds } });
export const setAvailability = (isAvailable, lat, lng) =>
  api('/helpers/availability', { method: 'PATCH', body: { isAvailable, lat, lng } });
export const getIncoming = () => api('/helpers/incoming');
export const acceptRequest = (id) => api(`/requests/${id}/accept`, { method: 'POST' });
export const rejectRequest = (id) => api(`/requests/${id}/reject`, { method: 'POST' });
export const updateJobStatus = (id, status, note) =>
  api(`/requests/${id}/status`, { method: 'PATCH', body: { status, note } });
export const getJobs = (cursor) =>
  api(`/helpers/jobs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);