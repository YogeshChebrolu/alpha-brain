-- Migration: Create inspirations table
-- Replaces hardcoded inspiration cards with database-driven content

CREATE TABLE IF NOT EXISTS inspirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Brain',
  gradient TEXT DEFAULT 'from-neutral-100 to-neutral-200',
  article_id UUID,
  banner_image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT fk_inspirations_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inspirations_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspirations_user_id ON inspirations(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirations_article_id ON inspirations(article_id);
CREATE INDEX IF NOT EXISTS idx_inspirations_display_order ON inspirations(display_order);
CREATE INDEX IF NOT EXISTS idx_inspirations_is_active ON inspirations(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_inspirations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inspirations_updated_at
  BEFORE UPDATE ON inspirations
  FOR EACH ROW
  EXECUTE FUNCTION update_inspirations_updated_at();

-- Enable RLS
ALTER TABLE inspirations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view active system inspirations or their own
CREATE POLICY "Users can view inspirations"
  ON inspirations FOR SELECT
  TO authenticated
  USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "Users can insert their own inspirations"
  ON inspirations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update their own inspirations"
  ON inspirations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can delete their own inspirations"
  ON inspirations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_system = false);

-- Seed default system inspirations (migrating from hardcoded data)
INSERT INTO inspirations (title, description, icon, gradient, is_system, is_active, display_order)
VALUES
  ('AlphaFold Revolution', 'AI solving protein folding - unlocking the secrets of biology', 'Dna', 'from-neutral-100 to-neutral-200', true, true, 1),
  ('SpaceX Starship', 'Making life multiplanetary - the next frontier of humanity', 'Rocket', 'from-neutral-100 to-neutral-200', true, true, 2),
  ('Neural Networks', 'Deep learning transforming every industry', 'Brain', 'from-neutral-100 to-neutral-200', true, true, 3),
  ('Quantum Computing', 'Computing at the edge of physics - solving the unsolvable', 'Cpu', 'from-neutral-100 to-neutral-200', true, true, 4)
ON CONFLICT DO NOTHING;
