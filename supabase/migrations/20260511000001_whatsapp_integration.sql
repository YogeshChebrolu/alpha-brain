-- WhatsApp Integration Tables
-- This migration creates tables for managing WhatsApp connections and messages
-- Compatible with existing notification_preferences table

-- =============================================================================
-- WhatsApp Connections Table
-- Stores connection state and credentials reference for each user
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Connection identity
  phone_number TEXT,                    -- E.164 format (+1234567890)
  jid TEXT,                             -- WhatsApp JID (unique identifier)

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'qr_generated',
    'link_code_generated',
    'connecting',
    'connected',
    'disconnected',
    'logged_out',
    'error'
  )),

  last_connected_at TIMESTAMPTZ,
  last_disconnected_at TIMESTAMPTZ,

  -- Pairing session info
  pairing_method TEXT CHECK (pairing_method IN ('qr_code', 'link_code')),
  pairing_session_id TEXT,

  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Metadata
  device_info JSONB,
  connection_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)  -- One WhatsApp connection per user
);

-- Index for efficient lookups (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id ON whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON whatsapp_connections(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone ON whatsapp_connections(phone_number);

-- =============================================================================
-- WhatsApp Messages Table
-- Stores message history for debugging and analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,

  -- Message identity
  message_id TEXT NOT NULL,             -- WhatsApp message ID
  remote_jid TEXT NOT NULL,             -- Chat/sender JID

  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Content
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN (
    'text',
    'image',
    'audio',
    'video',
    'document',
    'sticker',
    'location',
    'contact'
  )),
  body TEXT,
  media_url TEXT,
  media_mimetype TEXT,

  -- Timestamps
  message_timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  from_number TEXT,
  to_number TEXT,
  sender_name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  group_id TEXT,
  group_name TEXT,

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_connection_id ON whatsapp_messages(whatsapp_connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(message_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON whatsapp_messages(remote_jid);

-- =============================================================================
-- Extend existing notification_preferences table
-- Add WhatsApp-specific columns if they don't exist
-- (notification_preferences already has whatsapp_enabled, phone_number, quiet_hours)
-- =============================================================================

-- Add whatsapp_connected column to track active connection status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notification_preferences'
    AND column_name = 'whatsapp_connected'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN whatsapp_connected BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add whatsapp_action_reminders column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notification_preferences'
    AND column_name = 'whatsapp_action_reminders'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN whatsapp_action_reminders BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add whatsapp_portfolio_updates column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notification_preferences'
    AND column_name = 'whatsapp_portfolio_updates'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN whatsapp_portfolio_updates BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add whatsapp_daily_summary column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notification_preferences'
    AND column_name = 'whatsapp_daily_summary'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN whatsapp_daily_summary BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =============================================================================
-- Updated_at Trigger for whatsapp_connections
-- =============================================================================

-- Create trigger function (safe to run multiple times with CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to whatsapp_connections
DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_connections (DROP IF EXISTS for idempotency)
DROP POLICY IF EXISTS "Users can view their own WhatsApp connection" ON whatsapp_connections;
CREATE POLICY "Users can view their own WhatsApp connection"
  ON whatsapp_connections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own WhatsApp connection" ON whatsapp_connections;
CREATE POLICY "Users can insert their own WhatsApp connection"
  ON whatsapp_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own WhatsApp connection" ON whatsapp_connections;
CREATE POLICY "Users can update their own WhatsApp connection"
  ON whatsapp_connections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own WhatsApp connection" ON whatsapp_connections;
CREATE POLICY "Users can delete their own WhatsApp connection"
  ON whatsapp_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for whatsapp_messages
DROP POLICY IF EXISTS "Users can view their own WhatsApp messages" ON whatsapp_messages;
CREATE POLICY "Users can view their own WhatsApp messages"
  ON whatsapp_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_connections wc
      WHERE wc.id = whatsapp_connection_id
      AND wc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own WhatsApp messages" ON whatsapp_messages;
CREATE POLICY "Users can insert their own WhatsApp messages"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM whatsapp_connections wc
      WHERE wc.id = whatsapp_connection_id
      AND wc.user_id = auth.uid()
    )
  );

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE whatsapp_connections IS 'WhatsApp connection state for each user. Gateway uses service role to manage.';
COMMENT ON TABLE whatsapp_messages IS 'WhatsApp message history for debugging and analytics.';
COMMENT ON COLUMN notification_preferences.whatsapp_connected IS 'Whether user has an active WhatsApp connection';
COMMENT ON COLUMN notification_preferences.whatsapp_action_reminders IS 'Send action reminders via WhatsApp';
COMMENT ON COLUMN notification_preferences.whatsapp_portfolio_updates IS 'Send portfolio updates via WhatsApp';
COMMENT ON COLUMN notification_preferences.whatsapp_daily_summary IS 'Send daily summary via WhatsApp';
