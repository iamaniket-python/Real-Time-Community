import { api } from './client';

export const getHelperDetail = (id) => api(`/admin/helpers/${id}`);