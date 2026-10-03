import { api } from './client';

export const rateRequest = (id, score, comment) =>
  api(`/requests/${id}/rating`, { method: 'POST', body: { score, comment } });

export const reportRequest = (id, reason, details) =>
  api(`/requests/${id}/report`, { method: 'POST', body: { reason, details } });