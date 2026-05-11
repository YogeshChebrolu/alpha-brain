-- WhatsApp Encrypted Credentials Storage
-- This migration creates a table for securely storing WhatsApp credentials
-- Credentials are encrypted using AES-256-GCM before storage

-- =============================================================================
-- WhatsApp Credentials Table
-- Stores encrypted Baileys auth state (creds + keys)
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Encrypted credential data
  -- Format: { iv: string, data: string, authTag: string }
  -- The 'data' field contains AES-256-GCM encrypted JSON
  encrypted_creds JSONB,           -- creds.json contents (encrypted)
  encrypted_keys JSONB,            -- All keys combined (encrypted)

  -- Metadata (not sensitive)
  creds_version INTEGER DEFAULT 1, -- For future migrations
  key_count INTEGER DEFAULT 0,     -- Number of keys stored

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_restored_at TIMESTAMPTZ,    -- Last time credentials were loaded

  -- Constraints
  UNIQUE(user_id)  -- One credential set per user
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_credentials_user_id ON whatsapp_credentials(user_id);

-- =============================================================================
-- Updated_at Trigger
-- =============================================================================

-- Apply trigger to whatsapp_credentials
DROP TRIGGER IF EXISTS update_whatsapp_credentials_updated_at ON whatsapp_credentials;
CREATE TRIGGER update_whatsapp_credentials_updated_at
  BEFORE UPDATE ON whatsapp_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE whatsapp_credentials ENABLE ROW LEVEL SECURITY;

-- Note: Gateway uses service role key to bypass RLS
-- These policies are for direct user access (dashboard viewing metadata)

DROP POLICY IF EXISTS "Users can view their own credentials metadata" ON whatsapp_credentials;
CREATE POLICY "Users can view their own credentials metadata"
  ON whatsapp_credentials FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (gateway operations)
-- Users cannot directly modify credentials

-- =============================================================================
-- Service Role Policy (for gateway)
-- =============================================================================

-- The gateway uses the service role key which bypasses RLS
-- This comment documents the intended access pattern:
--
-- Gateway (service role) can:
-- - INSERT new credentials after successful pairing
-- - UPDATE credentials when keys rotate
-- - DELETE credentials on logout
-- - SELECT credentials for reconnection
--
-- Users (anon/authenticated) can:
-- - SELECT their own credentials metadata (not the encrypted data itself)

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE whatsapp_credentials IS 'Encrypted WhatsApp credentials for persistent sessions. Gateway uses service role.';
COMMENT ON COLUMN whatsapp_credentials.encrypted_creds IS 'AES-256-GCM encrypted creds.json from Baileys';
COMMENT ON COLUMN whatsapp_credentials.encrypted_keys IS 'AES-256-GCM encrypted Signal Protocol keys';
COMMENT ON COLUMN whatsapp_credentials.creds_version IS 'Schema version for future credential format migrations';
COMMENT ON COLUMN whatsapp_credentials.last_restored_at IS 'Timestamp of last credential restoration (server restart)';
