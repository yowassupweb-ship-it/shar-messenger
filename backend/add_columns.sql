ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_department_head BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Call history indexes (migration 2026-04-07)
CREATE INDEX IF NOT EXISTS idx_messages_notif_type ON messages(chat_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_messages_call_metadata ON messages(chat_id, ((metadata->>'callId'))) WHERE notification_type = 'call';
