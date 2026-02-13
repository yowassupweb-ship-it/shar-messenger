-- Add access fields for link lists
ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS allowed_users TEXT[] DEFAULT '{}';
ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS allowed_departments TEXT[] DEFAULT '{}';
ALTER TABLE link_lists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Backfill nulls for existing records
UPDATE link_lists SET allowed_users = '{}' WHERE allowed_users IS NULL;
UPDATE link_lists SET allowed_departments = '{}' WHERE allowed_departments IS NULL;
UPDATE link_lists SET is_public = true WHERE is_public IS NULL;

-- Index for fast filtering by visibility
CREATE INDEX IF NOT EXISTS idx_link_lists_is_public ON link_lists(is_public);
