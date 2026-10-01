import { Router } from 'express';
import { serveUpload } from '../controllers/upload.controller.js';

const router = Router();
router.get('/:filename', serveUpload);

export default router;