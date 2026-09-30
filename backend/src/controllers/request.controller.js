import * as svc from '../services/request.service.js';

export const create = async (req, res) => {
  const { request, created } = await svc.createRequest(req.user.id, req.body);
  res.status(created ? 201 : 200).json({ success: true, data: { request } });
};

export const list = async (req, res) =>
  res.json({ success: true, data: await svc.listMyRequests(req.user.id, req.query) });

export const getOne = async (req, res) =>
  res.json({ success: true, data: { request: await svc.getRequest(req.params.id, req.user) } });

export const accept = async (req, res) =>
  res.json({ success: true, data: { request: await svc.acceptRequest(req.params.id, req.user.id) } });

export const cancel = async (req, res) =>
  res.json({ success: true, data: { request: await svc.cancelRequest(req.params.id, req.user.id, req.body.reason) } });

export const updateStatus = async (req, res) =>
  res.json({ success: true, data: { request: await svc.updateStatus(req.params.id, req.user.id, req.body.status, req.body.note) } });

export const reject = async (req, res) => {
  await svc.rejectRequest(req.params.id, req.user.id);
  res.json({ success: true, data: null });
};