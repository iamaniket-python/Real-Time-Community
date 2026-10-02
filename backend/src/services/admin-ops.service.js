import { query, withTransaction } from '../config/db.js';
import { conflict, notFound } from '../utils/AppError.js';

const audit = (c, adminId, action, targetType, targetId, metadata) =>
  c.query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata)
     VALUES ($1, $2, $3, $4::text, $5::jsonb)`,
    [adminId, action, targetType, String(targetId), JSON.stringify(metadata ?? {})]);

const toCategory = (c) => ({ id: c.id, name: c.name, slug: c.slug, isActive: c.is_active });

const slugify = (name) => {
  const s = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || `category-${Date.now().toString(36)}`;
};

// 23505 = unique_violation (on the name or the slug)
const uniqueToConflict = (err) => {
  if (err.code === '23505') throw conflict('CATEGORY_EXISTS', 'A category with this name already exists');
  throw err;
};

export async function createCategory(adminId, { name }) {
  try {
    return await withTransaction(async (c) => {
      const { rows } = await c.query(
        'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug, is_active',
        [name, slugify(name)]);
      await audit(c, adminId, 'CATEGORY_CREATE', 'category', rows[0].id, { name, slug: rows[0].slug });
      return { category: toCategory(rows[0]) };
    });
  } catch (err) {
    return uniqueToConflict(err);
  }
}

export async function updateCategory(adminId, categoryId, { name, isActive }) {
  try {
    return await withTransaction(async (c) => {
      const cur = await c.query(
        'SELECT id, name, is_active FROM categories WHERE id = $1 FOR UPDATE', [categoryId]);
      if (!cur.rows[0]) throw notFound('CATEGORY_NOT_FOUND', 'Category not found');

      // The slug is kept on rename so existing links keep working
      const { rows } = await c.query(
        `UPDATE categories
            SET name = COALESCE($2, name),
                is_active = COALESCE($3::boolean, is_active),
                updated_at = now()
          WHERE id = $1
          RETURNING id, name, slug, is_active`,
        [categoryId, name ?? null, isActive ?? null]);
      await audit(c, adminId, 'CATEGORY_UPDATE', 'category', categoryId, {
        from: { name: cur.rows[0].name, isActive: cur.rows[0].is_active },
        to: { name: rows[0].name, isActive: rows[0].is_active },
      });
      return { category: toCategory(rows[0]) };
    });
  } catch (err) {
    return uniqueToConflict(err);
  }
}

export async function listActiveRequests({ limit }) {
  const { rows } = await query(
    `SELECT r.id, r.title, r.status::text AS status, r.created_at,
            cat.name AS category_name,
            u.id AS user_id, u.name AS user_name,
            hu.id AS helper_user_id, hu.name AS helper_name
       FROM help_requests r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN categories cat ON cat.id = r.category_id
       LEFT JOIN helper_profiles hp ON hp.id = r.accepted_helper_id
       LEFT JOIN users hu ON hu.id = hp.user_id
      WHERE r.status IN ('PENDING','SEARCHING','ACCEPTED','ARRIVING','IN_PROGRESS')
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT $1`, [limit]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      category: r.category_name,
      createdAt: r.created_at,
      requester: { id: r.user_id, name: r.user_name },
      helper: r.helper_user_id ? { id: r.helper_user_id, name: r.helper_name } : null,
    })),
  };
}

const grouped = async (sql) =>
  Object.fromEntries((await query(sql)).rows.map((r) => [r.k, r.n]));

export async function getStats() {
  const [usersByRole, usersByStatus, helpersByVerification, requestsByStatus, reportsByStatus, ratings] =
    await Promise.all([
      grouped('SELECT role::text AS k, count(*)::int AS n FROM users GROUP BY 1'),
      grouped('SELECT status::text AS k, count(*)::int AS n FROM users GROUP BY 1'),
      grouped('SELECT verification::text AS k, count(*)::int AS n FROM helper_profiles GROUP BY 1'),
      grouped('SELECT status::text AS k, count(*)::int AS n FROM help_requests GROUP BY 1'),
      grouped('SELECT status::text AS k, count(*)::int AS n FROM reports GROUP BY 1'),
      query(`SELECT count(*)::int AS n, round(avg(score)::numeric, 2) AS avg FROM ratings`),
    ]);
  return {
    usersByRole,
    usersByStatus,
    helpersByVerification,
    requestsByStatus,
    reportsByStatus,
    ratings: { count: ratings.rows[0].n, average: Number(ratings.rows[0].avg ?? 0) },
  };
}