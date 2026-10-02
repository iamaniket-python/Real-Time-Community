import { api } from './client';

const qs = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const createRequest = (payload) =>
  api('/requests', {
    method: 'POST',
    body: { idempotencyKey: crypto.randomUUID(), ...payload },
  });

export const listRequests = (params) => api(`/requests${qs(params)}`);

export const getRequest = (id) => api(`/requests/${id}`);

export const cancelRequest = (id, reason) =>
  api(`/requests/${id}/cancel`, { method: 'POST', body: reason ? { reason } : {} });