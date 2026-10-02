import { Router } from 'express';
import * as c from '../controllers/message.controller.js';
import * as attachment from '../controllers/attachment.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import {
  sendMessageSchema, sendAttachmentSchema, conversationIdSchema,
  listMessagesSchema, listConversationsSchema,
} from '../validators/message.validator.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// 30 messages per minute per user
const sendLimiter = makeLimiter({
  prefix: 'msg-send',
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'You are sending messages too fast', errorCode: 'RATE_LIMITED' },
});

// Stricter for images: 10 per minute per user
const uploadLimiter = makeLimiter({
  prefix: 'msg-upload',
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.user.id,
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