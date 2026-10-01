import * as svc from '../services/admin.service.js';

/** GET /api/admin/helpers */
export async function helpers(req, res) {
  res.json({ success: true, data: await svc.listHelpers(req.query) });
}

/** POST /api/admin/helpers/:id/(verify|reject|suspend) */
export const helperAction = (action) => async (req, res) => {
  const data = await svc.changeHelperStatus(req.user.id, req.params.id, action, req.body.reason);
  res.json({ success: true, data });
};

/** POST /api/admin/users/:id/(block|unblock) */
export const userAction = (action) => async (req, res) => {
  const data = await svc.changeUserStatus(req.user.id, req.params.id, action, req.body.reason);
  res.json({ success: true, data });
};