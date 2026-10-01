import { sendAttachment } from '../services/message.service.js';

/** POST /api/messages/:conversationId/attachments */
export async function send(req, res) {
  const { message, created } = await sendAttachment(req.user.id, {
    conversationId: req.params.conversationId,
    caption: req.body.caption,
    clientId: req.body.clientId,
    file: req.file,
  });
  res.status(created ? 201 : 200).json({ success: true, data: { message } });
}