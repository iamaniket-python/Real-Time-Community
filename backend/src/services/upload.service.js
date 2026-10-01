import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// backend/uploads, outside src, never served as static files
export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Detected MIME type -> file extension. Anything else is rejected.
export const ALLOWED_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME_BY_EXT = Object.fromEntries(Object.entries(ALLOWED_TYPES).map(([mime, ext]) => [ext, mime]));

const FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const URL_PREFIX = '/api/uploads/';
const SIGNED_URL_TTL_SECONDS = 300;

export const isValidFilename = (name) => typeof name === 'string' && FILENAME_RE.test(name);
export const mimeForFilename = (name) => MIME_BY_EXT[name.split('.').pop()];

/** Stored value for the database, e.g. /api/uploads/<uuid>.jpg */
export const filenameFromPath = (storedPath) =>
  typeof storedPath === 'string' && storedPath.startsWith(URL_PREFIX)
    ? storedPath.slice(URL_PREFIX.length)
    : null;

/** Writes an already-validated image buffer under a random name. */
export async function storeImage(buffer, ext) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  // 'wx' fails instead of overwriting an existing file
  await writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: 'wx' });
  return { filename, path: URL_PREFIX + filename, size: buffer.length, mime: MIME_BY_EXT[ext] };
}

/** Best effort: used to clean up when a database insert fails after the file was written. */
export async function deleteStored(storedPath) {
  const filename = filenameFromPath(storedPath) ?? storedPath;
  if (!isValidFilename(filename)) return;
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn({ err, filename }, 'could not delete upload');
  }
}

const sign = (filename, exp) =>
  createHmac('sha256', env.UPLOAD_SECRET).update(`${filename}.${exp}`).digest('hex');

/**
 * Turns a stored path into a short-lived URL. Call this ONLY after checking the caller
 * may see the file. The URL is relative: the client prefixes the API origin.
 */
export function signedUrl(storedPath, ttlSeconds = SIGNED_URL_TTL_SECONDS) {
  const filename = filenameFromPath(storedPath);
  if (!isValidFilename(filename)) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${URL_PREFIX}${filename}?exp=${exp}&sig=${sign(filename, exp)}`;
}

export function verifySignature(filename, exp, sig) {
  if (typeof exp !== 'string' || !/^\d{1,12}$/.test(exp)) return false;
  if (typeof sig !== 'string' || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(Buffer.from(sign(filename, exp), 'hex'), Buffer.from(sig, 'hex'));
}