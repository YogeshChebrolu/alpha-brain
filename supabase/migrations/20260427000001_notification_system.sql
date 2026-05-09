-- Migration: Add notification system tables
-- Purpose: Support WhatsApp, Push, and In-App notifications for idea/action alerts
-- Date: 2026-04-27

-- ============================================================================
-- TABLE: notification_preferences
-- User's notification settings including phone number and channel preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Channel toggles
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,

    -- Quiet hours (stored in user's timezone)
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone TEXT DEFAULT 'UTC',

    -- Default reminder time (minutes before due)
    default_reminder_minutes INTEGER DEFAULT 15,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Index for quick user lookup
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

COMMENT ON TABLE notification_preferences IS 'User notification settings for alerts';

-- ============================================================================
-- TABLE: push_subscriptions
-- Web Push subscription data per device
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

COMMENT ON TABLE push_subscriptions IS 'Web Push subscription data per device';

-- ============================================================================
-- TABLE: in_app_notifications
-- Notification inbox for in-app alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- What triggered this notification
    type TEXT NOT NULL CHECK (type IN ('idea_reminder', 'action_reminder', 'system')),
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,

    -- Notification content
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,

    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_unread ON in_app_notifications(user_id, read) WHERE NOT read;

COMMENT ON TABLE in_app_notifications IS 'In-app notification inbox';

-- ============================================================================
-- ALTER existing alert tables: Add user_id, sent_at, error_message
-- ============================================================================

-- Add columns to idea_alerts
ALTER TABLE idea_alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE idea_alerts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE idea_alerts ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE idea_alerts ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 15;

-- Add columns to action_alerts
ALTER TABLE action_alerts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE action_alerts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE action_alerts ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE action_alerts ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 15;

-- ============================================================================
-- INDEXES for efficient pending alert queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_idea_alerts_pending
    ON idea_alerts(next_run_at)
    WHERE status = 'active' AND sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_action_alerts_pending
    ON action_alerts(next_run_at)
    WHERE status = 'active' AND sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_idea_alerts_user ON idea_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_action_alerts_user ON action_alerts(user_id);

-- ============================================================================
-- FUNCTION: Update user_id on idea_alerts from ideas table
-- ============================================================================
CREATE OR REPLACE FUNCTION set_idea_alert_user_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT user_id INTO NEW.user_id FROM ideas WHERE id = NEW.idea_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_set_idea_alert_user_id
    BEFORE INSERT ON idea_alerts
    FOR EACH ROW
    WHEN (NEW.user_id IS NULL)
    EXECUTE FUNCTION set_idea_alert_user_id();

-- ============================================================================
-- FUNCTION: Update user_id on action_alerts from actions->ideas table
-- ============================================================================
CREATE OR REPLACE FUNCTION set_action_alert_user_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT i.user_id INTO NEW.user_id
    FROM actions a
    JOIN ideas i ON a.idea_id = i.id
    WHERE a.id = NEW.action_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_set_action_alert_user_id
    BEFORE INSERT ON action_alerts
    FOR EACH ROW
    WHEN (NEW.user_id IS NULL)
    EXECUTE FUNCTION set_action_alert_user_id();

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Notification preferences: users can only access their own
CREATE POLICY "Users can view own notification preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Push subscriptions: users can only access their own
CREATE POLICY "Users can view own push subscriptions"
    ON push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
    ON push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
    ON push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- In-app notifications: users can only access their own
CREATE POLICY "Users can view own in-app notifications"
    ON in_app_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own in-app notifications"
    ON in_app_notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can do anything (for edge functions)
CREATE POLICY "Service role full access notification_preferences"
    ON notification_preferences FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access push_subscriptions"
    ON push_subscriptions FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access in_app_notifications"
    ON in_app_notifications FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Enable realtime for in_app_notifications
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;
