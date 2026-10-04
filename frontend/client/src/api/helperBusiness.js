import { api } from './client';

export const getBusiness = () => api('/helpers/me/business');
export const saveBusiness = (body) => api('/helpers/me/business', { method: 'PUT', body });
export const getDocuments = () => api('/helpers/me/documents');

export function uploadDocument(type, file) {
  const form = new FormData();
  form.append('file', file);
  return api(`/helpers/me/documents/${type}`, { method: 'POST', form });
}