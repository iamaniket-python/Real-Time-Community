import { Router } from 'express';
import { query } from '../config/db.js';

const router = Router();

// Public. Redis caching is added in Phase 8.
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, slug, icon FROM categories WHERE is_active ORDER BY id');
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, data: { categories: rows } });
  } catch (err) { next(err); }
});

export default router;