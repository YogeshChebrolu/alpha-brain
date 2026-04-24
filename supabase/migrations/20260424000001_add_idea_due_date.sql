-- Migration: Add due_date column to ideas table
-- Purpose: Support idea-level deadlines separate from action deadlines
-- Date: 2026-04-24

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Add index for querying ideas by due date
CREATE INDEX IF NOT EXISTS idx_ideas_due_date ON ideas(due_date) WHERE due_date IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN ideas.due_date IS 'Deadline for the entire idea (separate from individual action deadlines)';
