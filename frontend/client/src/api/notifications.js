import { api } from './client';

// GET /notifications -> assumed { items: [], nextCursor }
export function listNotifications(unread = false, cursor = null) {
  const params = new URLSearchParams({ limit: '20' });
  if (unread) params.set('unread', 'true');
  if (cursor) params.set('cursor', cursor);
  return api(`/notifications?${params.toString()}`);
}

// GET /notifications/unread-count -> raw data (the hook reads unreadCount or count)
export function getUnreadCount() {
  return api('/notifications/unread-count');
}

export function markRead(id) {
  return api(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllRead() {
  return api('/notifications/read-all', { method: 'PATCH' });
}