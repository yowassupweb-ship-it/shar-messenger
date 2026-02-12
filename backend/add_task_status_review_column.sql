-- Migration: restore task status review comment persistence
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS review_comment TEXT;

-- Optional consistency backfill
UPDATE tasks
SET status = 'pending'
WHERE status IS NULL OR TRIM(status) = '';
