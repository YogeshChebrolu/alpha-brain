-- Add gradient column if it doesn't exist (color already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'gradient'
  ) THEN
    ALTER TABLE categories ADD COLUMN gradient TEXT DEFAULT 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)';
  END IF;
END $$;

-- Add archived columns to categories if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'archived'
  ) THEN
    ALTER TABLE categories ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE categories ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add archived columns to ideas if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'archived'
  ) THEN
    ALTER TABLE ideas ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideas' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE ideas ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Update existing categories with default gradient
UPDATE categories
SET gradient = 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
WHERE gradient IS NULL;

-- Update existing items with default archived value
UPDATE categories SET archived = false WHERE archived IS NULL;
UPDATE ideas SET archived = false WHERE archived IS NULL;
