-- Migration: Add archive functionality
-- Purpose: Soft delete for categories and ideas
-- Date: 2026-04-24

-- Add archived columns
ALTER TABLE categories ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add archived_at timestamp for tracking when items were archived
ALTER TABLE categories ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Indexes for filtering out archived items
CREATE INDEX IF NOT EXISTS idx_categories_archived ON categories(user_id, archived) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_ideas_archived ON ideas(user_id, archived) WHERE archived = FALSE;

-- Comments
COMMENT ON COLUMN categories.archived IS 'Soft delete flag - archived categories are hidden from UI';
COMMENT ON COLUMN ideas.archived IS 'Soft delete flag - archived ideas are hidden from UI';
