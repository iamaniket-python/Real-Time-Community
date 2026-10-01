import { UPLOAD_DIR, isValidFilename, mimeForFilename, verifySignature } from '../services/upload.service.js';

const notFoundBody = { success: false, message: 'File not found', errorCode: 'FILE_NOT_FOUND' };

/** GET /api/uploads/:filename?exp=...&sig=... (the signature IS the authorization) */
export function serveUpload(req, res) {
  const { filename } = req.params;
  const { exp, sig } = req.query;

  // Bad name, bad signature and expired link all look the same
  if (!isValidFilename(filename) || !verifySignature(filename, exp, sig)) {
    return res.status(404).json(notFoundBody);
  }

  res.set({
    'Content-Type': mimeForFilename(filename),
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, max-age=300',
    // Helmet's default blocks <img> from the React origin; the signature is the guard here
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  res.sendFile(filename, { root: UPLOAD_DIR, dotfiles: 'deny', acceptRanges: false }, (err) => {
    if (err && !res.headersSent) res.status(404).json(notFoundBody);
  });
}