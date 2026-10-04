import { api } from './client';

export const openHelperChat = (helperId) =>
  api(`/admin/helpers/${helperId}/chat`, { method: 'POST' });

export const listMyConversations = () => api('/conversations');