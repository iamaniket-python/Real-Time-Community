import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '../utils/logger.js';
import { ALLOWED_TYPES, MAX_IMAGE_BYTES } from '../services/upload.service.js';

// Memory storage: nothing touches the disk until the bytes are verified
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5, parts: 6 },
}).single('file');

const fail = (res, status, errorCode, message) =>
  res.status(status).json({ success: false, message, errorCode });

/**
 * Accepts one image in the multipart field "file". On success sets
 * req.file.buffer and req.file.detected = { mime, ext } (from the file's bytes).
 * Put it AFTER authenticate and rate limiting in the route.
 */
export function uploadImage(req, res, next) {
  parser(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return fail(res, 413, 'FILE_TOO_LARGE', 'Image must be 5 MB or smaller');
      }
      if (err instanceof multer.MulterError) {
        return fail(res, 422, 'VALIDATION_ERROR', 'Send exactly one file in the "file" field');
      }
      logger.debug({ err }, 'upload parse failed');
      return fail(res, 400, 'INVALID_UPLOAD', 'Could not read the upload');
    }
    if (!req.file) return fail(res, 422, 'FILE_REQUIRED', 'No file was uploaded');

    let type;
    try {
      type = await fileTypeFromBuffer(req.file.buffer);
    } catch (e) {
      logger.debug({ err: e }, 'file type detection failed');
    }
    const ext = type ? ALLOWED_TYPES[type.mime] : undefined;
    if (!ext) return fail(res, 415, 'UNSUPPORTED_FILE_TYPE', 'Only JPEG, PNG or WebP images are allowed');

    req.file.detected = { mime: type.mime, ext };
    next();
  });
}