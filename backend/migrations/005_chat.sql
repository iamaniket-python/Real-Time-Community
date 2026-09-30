ALTER TABLE messages ADD COLUMN client_id varchar(64);
-- NULL client ids are allowed many times; a real client id can only be used once per sender per chat
CREATE UNIQUE INDEX messages_client_uq ON messages (conversation_id, sender_id, client_id);