import { api } from './client';

export const getAssignedHelper = (requestId) => api(`/requests/${requestId}/helper`);