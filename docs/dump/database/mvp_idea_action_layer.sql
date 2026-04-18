-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Core reference)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEMPLATES TABLE (Form structures)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    form_structure JSONB NOT NULL, -- Defines the dynamic UI fields
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Logic: System templates have no owner; User templates must have an owner
    CONSTRAINT system_template_check CHECK (
        (is_system = true AND user_id IS NULL) OR
        (is_system = false AND user_id IS NOT NULL)
    )
);

-- 3. CATEGORIES TABLE
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    template_id UUID REFERENCES templates(id),
    name TEXT NOT NULL,
    icon TEXT, -- Storage path or lucide-react icon name
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. IDEAS TABLE (The simplified MVP version)
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    parent_id UUID REFERENCES ideas(id), -- For branching logic
    title TEXT NOT NULL,
    content_json JSONB, -- Actual data entered into the template fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RESOURCES TABLE (Base table for files/links)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    url TEXT NOT NULL,
    type TEXT, -- 'image', 'news_article', 'podcast', etc.
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ATTACHMENTS (Option C: Separate tables)
CREATE TABLE idea_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE
);

-- 7. ACTIONS TABLE
CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    due_time TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT status_check CHECK (status IN ('pending', 'inprogress', 'done', 'skipped'))
);

-- 8. ACTION UPDATES (The narrative log)
CREATE TABLE action_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ACTION ATTACHMENTS
CREATE TABLE action_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE
);

-- 10. ALERTS (Option C with Cron Logic)
CREATE TABLE idea_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'one-time', 'recurrent'
    channel TEXT NOT NULL, -- 'whatsapp', 'push'
    cron_expression TEXT,
    next_run_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    CONSTRAINT idea_alert_type_check CHECK (alert_type IN ('one-time', 'recurrent')),
    CONSTRAINT idea_alert_status_check CHECK (status IN ('active', 'paused', 'completed'))
);

CREATE TABLE action_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    channel TEXT NOT NULL,
    cron_expression TEXT,
    next_run_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    CONSTRAINT action_alert_type_check CHECK (alert_type IN ('one-time', 'recurrent')),
    CONSTRAINT action_alert_status_check CHECK (status IN ('active', 'paused', 'completed'))
);

-- TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ideas_updated BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_actions_updated BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION update_timestamp();
