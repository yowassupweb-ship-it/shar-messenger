-- Migration: ensure chats.todo_id exists for task-chat linkage
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS todo_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_chats_todo_id ON chats(todo_id);
