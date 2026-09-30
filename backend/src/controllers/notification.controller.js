import * as svc from '../services/notification.service.js';

export const list = async (req, res) =>
  res.json({ success: true, data: await svc.listNotifications(req.user.id, req.query) });

export const count = async (req, res) =>
  res.json({ success: true, data: { unreadCount: await svc.unreadCount(req.user.id) } });

export const read = async (req, res) =>
  res.json({ success: true, data: { unreadCount: await svc.markRead(req.user.id, req.params.id) } });

export const readAll = async (req, res) =>
  res.json({ success: true, data: { unreadCount: await svc.markAllRead(req.user.id) } });