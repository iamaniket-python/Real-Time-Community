import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import * as r from '../controllers/admin-reports.controller.js';
import * as o from '../controllers/admin-ops.controller.js';
import * as d from '../controllers/admin-helper-detail.controller.js';
import * as ac from '../controllers/admin-chat.controller.js';
import * as sc from '../controllers/admin-seller.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { listHelpersSchema, helperActionSchema, userActionSchema } from '../validators/admin.validator.js';
import { listReportsSchema, updateReportSchema, auditLogSchema } from '../validators/admin-reports.validator.js';
import { createCategorySchema, updateCategorySchema, activeRequestsSchema } from '../validators/admin-ops.validator.js';
import { listSellersSchema, sellerIdSchema, sellerActionSchema } from '../validators/admin-seller.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Mounted at /api/admin. Every route needs an ADMIN (re-checked in the DB on each request).
const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/helpers', validate(listHelpersSchema), wrap(c.helpers));
router.get('/helpers/:id', wrap(d.detail));
router.post('/helpers/:id/chat', wrap(ac.open));
router.post('/helpers/:id/verify',  validate(helperActionSchema), wrap(c.helperAction('verify')));
router.post('/helpers/:id/reject',  validate(helperActionSchema), wrap(c.helperAction('reject')));
router.post('/helpers/:id/suspend', validate(helperActionSchema), wrap(c.helperAction('suspend')));

router.get('/sellers', validate(listSellersSchema), wrap(sc.list));
router.get('/sellers/:id', validate(sellerIdSchema), wrap(sc.detail));
router.post('/sellers/:id/verify',  validate(sellerActionSchema), wrap(sc.action('verify')));
router.post('/sellers/:id/reject',  validate(sellerActionSchema), wrap(sc.action('reject')));
router.post('/sellers/:id/suspend', validate(sellerActionSchema), wrap(sc.action('suspend')));

router.post('/users/:id/block',     validate(userActionSchema),   wrap(c.userAction('block')));
router.post('/users/:id/unblock',   validate(userActionSchema),   wrap(c.userAction('unblock')));

router.get('/reports',        validate(listReportsSchema),  wrap(r.reports));
router.patch('/reports/:id',  validate(updateReportSchema), wrap(r.updateReport));
router.get('/audit-log',      validate(auditLogSchema),     wrap(r.auditLog));

router.get('/categories',       wrap(o.listCategories));
router.post('/categories',      validate(createCategorySchema), wrap(o.createCategory));
router.patch('/categories/:id', validate(updateCategorySchema), wrap(o.updateCategory));
router.get('/requests/active',  validate(activeRequestsSchema), wrap(o.activeRequests));
router.get('/stats',            wrap(o.stats));

export default router;