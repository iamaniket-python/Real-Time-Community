import * as svc from '../services/helper.service.js';
import * as matching from '../services/matching.service.js';
import * as requestSvc from '../services/request.service.js';

export const me = async (req, res) =>
  res.json({ success: true, data: { profile: await svc.getMyProfile(req.user.id) } });

export const setCategories = async (req, res) =>
  res.json({ success: true, data: { profile: await svc.setCategories(req.user.id, req.body.categoryIds) } });

export const setAvailability = async (req, res) =>
  res.json({ success: true, data: { profile: await svc.setAvailability(req.user.id, req.body) } });

export const nearby = async (req, res) =>
  res.json({ success: true, data: await matching.findNearbyHelpers(req.query) });

export const incoming = async (req, res) =>
  res.json({ success: true, data: await matching.getIncomingRequests(req.user.id) });

export const jobs = async (req, res) =>
  res.json({ success: true, data: await requestSvc.listHelperJobs(req.user.id, req.query) });