import { query } from '../config/db.js';
import { notFound } from '../utils/AppError.js';

const find = (adminId, helperUserId) =>
  query(
    `SELECT id FROM conversations
      WHERE request_id IS NULL AND user_id = $1 AND helper_user_id = $2`,
    [adminId, helperUserId]);

/** Returns the admin<->helper conversation id, creating it on first use. helperId = profile id. */
export async function openHelperChat(adminId, helperId) {
  const hp = (await query(
    'SELECT user_id FROM helper_profiles WHERE id::text = $1', [String(helperId)])).rows[0];
  if (!hp) throw notFound('HELPER_NOT_FOUND', 'Helper not found');

  const existing = (await find(adminId, hp.user_id)).rows[0];
  if (existing) return { conversationId: existing.id };
  try {
    const ins = await query(
      `INSERT INTO conversations (request_id, user_id, helper_user_id)
       VALUES (NULL, $1, $2) RETURNING id`, [adminId, hp.user_id]);
    return { conversationId: ins.rows[0].id };
  } catch (err) {
    if (err.code !== '23505') throw err;
    return { conversationId: (await find(adminId, hp.user_id)).rows[0].id };
  }
}