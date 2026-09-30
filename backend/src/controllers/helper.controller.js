import * as svc from '../services/helper.service.js';

export const me = async (req, res) =>
  res.json({ success: true, data: { profile: await svc.getMyProfile(req.user.id) } });

export const setCategories = async (req, res) =>
  res.json({ success: true, data: { profile: await svc.setCategories(req.user.id, req.body.categoryIds) } });

export const setAvailability = async (req, res) =>
  res.json({ success: true, data: { profile: await svc.setAvailability(req.user.id, req.body) } });