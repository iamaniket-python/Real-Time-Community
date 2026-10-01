import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/message.controller.js';
import * as attachment from '../controllers/attachment.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import {
  sendMessageSchema, sendAttachmentSchema, conversationIdSchema,
  listMessagesSchema, listConversationsSchema,
} from '../validators/message.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 30 messages per minute per user (in-memory now; Redis store in Phase 8)
const sendLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, message: 'You are sending messages too fast', errorCode: 'RATE_LIMITED' },
});

// Stricter for images: 10 per minute per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  validate: { keyGeneratorIpFallback: false },
  message: { success: false, message: 'You are uploading too fast', errorCode: 'RATE_LIMITED' },
});

// /api/conversations
export const conversationRouter = Router();
conversationRouter.use(authenticate, authorize('USER', 'HELPER'));
conversationRouter.get('/', validate(listConversationsSchema), wrap(c.conversations));

// /api/messages
const router = Router();
router.use(authenticate, authorize('USER', 'HELPER'));
router.post('/', sendLimiter, validate(sendMessageSchema), wrap(c.send));
router.post('/:conversationId/attachments',
  sendLimiter, uploadLimiter, uploadImage, validate(sendAttachmentSchema), wrap(attachment.send));
router.post('/:conversationId/read', validate(conversationIdSchema), wrap(c.read));
router.get('/:conversationId', validate(listMessagesSchema), wrap(c.history));

export default router;