import { query, withTransaction } from '../config/db.js';
import { AppError, forbidden, notFound } from '../utils/AppError.js';

const profileQuery = `
  SELECT hp.id, hp.bio, hp.verification, hp.is_available, hp.current_lat, hp.current_lng,
         hp.location_updated_at, hp.rating_avg, hp.rating_count,
         COALESCE((SELECT json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.id)
                     FROM helper_categories hc JOIN categories c ON c.id = hc.category_id
                    WHERE hc.helper_id = hp.id), '[]'::json) AS categories
    FROM helper_profiles hp WHERE hp.user_id = $1`;

const toDto = (p) => ({
  id: p.id,
  bio: p.bio,
  verification: p.verification,
  isAvailable: p.is_available,
  lat: p.current_lat,
  lng: p.current_lng,
  locationUpdatedAt: p.location_updated_at,
  ratingAvg: Number(p.rating_avg),
  ratingCount: p.rating_count,
  categories: p.categories,
});

export async function getMyProfile(userId) {
  const { rows } = await query(profileQuery, [userId]);
  if (!rows[0]) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');
  return toDto(rows[0]);
}

export async function setCategories(userId, categoryIds) {
  const ids = [...new Set(categoryIds)];
  await withTransaction(async (c) => {
    const hp = (await c.query('SELECT id FROM helper_profiles WHERE user_id = $1', [userId])).rows[0];
    if (!hp) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');

    const valid = await c.query(
      'SELECT count(*)::int AS n FROM categories WHERE is_active AND id = ANY($1::int[])', [ids]);
    if (valid.rows[0].n !== ids.length) {
      throw new AppError(422, 'CATEGORY_NOT_FOUND', 'One or more categories are invalid');
    }

    await c.query('DELETE FROM helper_categories WHERE helper_id = $1', [hp.id]);
    await c.query(
      'INSERT INTO helper_categories (helper_id, category_id) SELECT $1, unnest($2::int[])',
      [hp.id, ids]);
  });
  return getMyProfile(userId);
}

export async function setAvailability(userId, { isAvailable, lat, lng }) {
  const hp = (await query(
    `SELECT id, verification,
            EXISTS (SELECT 1 FROM helper_categories WHERE helper_id = helper_profiles.id) AS has_categories
       FROM helper_profiles WHERE user_id = $1`, [userId])).rows[0];
  if (!hp) throw notFound('HELPER_PROFILE_NOT_FOUND', 'Helper profile not found');

  if (isAvailable) {
    if (hp.verification !== 'VERIFIED') {
      throw forbidden('HELPER_NOT_VERIFIED', 'Your profile must be verified before you can go online');
    }
    if (!hp.has_categories) {
      throw new AppError(422, 'NO_CATEGORIES', 'Select at least one service before going online');
    }
  }

  await query(
    `UPDATE helper_profiles
        SET is_available = $2,
            current_lat = COALESCE($3::double precision, current_lat),
            current_lng = COALESCE($4::double precision, current_lng),
            location_updated_at = CASE WHEN $3::double precision IS NOT NULL THEN now()
                                       ELSE location_updated_at END
      WHERE id = $1`,
    [hp.id, isAvailable, lat ?? null, lng ?? null]);
  return getMyProfile(userId);
}