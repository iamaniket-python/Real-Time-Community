import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/seller.controller.js';
import * as p from '../controllers/product.controller.js';
import * as so from '../controllers/seller-order.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { sellerProfileSchema, sellerOpenSchema } from '../validators/seller.validator.js';
import {
  createProductSchema, updateProductSchema, productIdSchema, listProductsSchema,
} from '../validators/product.validator.js';
import { orderIdSchema } from '../validators/checkout.validator.js';
import { listSellerOrdersSchema } from '../validators/order.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many uploads, try again later', errorCode: 'RATE_LIMITED' },
});

// Mounted at /api/sellers. Everything here is for the logged-in seller.
const router = Router();
router.use(authenticate, authorize('SELLER'));

router.get('/me', wrap(c.me));
router.put('/me', validate(sellerProfileSchema), wrap(c.save));
router.patch('/me/open', validate(sellerOpenSchema), wrap(c.open));
router.get('/me/documents', wrap(c.documents));
router.post('/me/documents/:type', uploadLimiter, uploadImage, wrap(c.uploadDoc));
router.get('/me/gallery', wrap(c.gallery));
router.post('/me/gallery', uploadLimiter, uploadImage, wrap(c.addImage));
router.delete('/me/gallery/:imageId', wrap(c.removeImage));

router.get('/me/products', validate(listProductsSchema), wrap(p.listMine));
router.post('/me/products', validate(createProductSchema), wrap(p.create));
router.patch('/me/products/:id', validate(updateProductSchema), wrap(p.update));
router.delete('/me/products/:id', validate(productIdSchema), wrap(p.remove));
router.post('/me/products/:id/image',
  validate(productIdSchema), uploadLimiter, uploadImage, wrap(p.setImage));

router.get('/me/orders', validate(listSellerOrdersSchema), wrap(so.list));
router.get('/me/orders/:id', validate(orderIdSchema), wrap(so.detail));
router.patch('/me/orders/:id/confirm', validate(orderIdSchema), wrap(so.confirm));
router.patch('/me/orders/:id/ready', validate(orderIdSchema), wrap(so.ready));
router.patch('/me/orders/:id/complete', validate(orderIdSchema), wrap(so.complete));

export default router;