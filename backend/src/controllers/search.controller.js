import * as s from '../services/search.service.js';

const ok = (res, data) => res.json({ success: true, data });

export const search = async (req, res) => ok(res, await s.search(req.query));