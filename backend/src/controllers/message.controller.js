import * as svc from '../services/message.service.js';

export const conversations = async (req, res) =>
  res.json({ success: true, data: await svc.listConversations(req.user.id, req.query) });

export const history = async (req, res) =>
  res.json({ success: true, data: await svc.getMessages(req.user.id, req.params.conversationId, req.query) });

export const send = async (req, res) => {
  const { message, created } = await svc.sendMessage(req.user.id, req.body);
  res.status(created ? 201 : 200).json({ success: true, data: { message } });
};

export const read = async (req, res) =>
  res.json({ success: true, data: await svc.markConversationRead(req.user.id, req.params.conversationId) });