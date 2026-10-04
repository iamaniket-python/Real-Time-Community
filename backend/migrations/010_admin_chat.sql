ALTER TABLE conversations ALTER COLUMN request_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS admin_chat_unique
  ON conversations (user_id, helper_user_id) WHERE request_id IS NULL;