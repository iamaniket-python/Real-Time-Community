import { api } from './client';

export const getConversation = (requestId) =>
  api(`/conversations?requestId=${encodeURIComponent(requestId)}`);

export const getMessages = (conversationId, cursor) =>
  api(`/messages/${conversationId}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`);

export const sendMessage = (conversationId, body, clientId) =>
  api('/messages', { method: 'POST', body: { conversationId, body, clientId } });

export const markConversationRead = (conversationId) =>
  api(`/messages/${conversationId}/read`, { method: 'POST' });