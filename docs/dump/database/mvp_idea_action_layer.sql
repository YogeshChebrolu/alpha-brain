-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: We use Supabase's built-in auth.users table instead of creating our own
-- No need to create a users table - Supabase provides auth.users automatically

-- 2. TEMPLATES TABLE (Form structures)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT, -- Emoji or icon name
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. IDEAS TABLE (The simplified MVP version)
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES ideas(id) ON DELETE SET NULL, -- For branching logic
    title TEXT NOT NULL,
    content_json JSONB, -- Actual data entered into the template fields
    due_date TIMESTAMPTZ, -- Idea-level deadline
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RESOURCES TABLE (Base table for files/links)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT, -- 'image', 'news_article', 'podcast', etc.
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ATTACHMENTS (Option C: Separate tables)
CREATE TABLE idea_attachments (
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (idea_id, resource_id)
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
    action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (action_id, resource_id)
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

-- 11. STOCK PRICES CACHE (for Stock Ticker & Stock Graph elements)
CREATE TABLE daily_stock_prices (
    ticker TEXT PRIMARY KEY,
    close_price DECIMAL(10, 2),
    change_pct DECIMAL(5, 2),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    historical_prices JSONB -- Array of {date, close} objects
);

CREATE INDEX idx_daily_stock_prices_synced ON daily_stock_prices(last_synced_at);
CREATE INDEX idx_stock_prices_ticker ON daily_stock_prices(ticker);

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

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_category_id ON ideas(category_id);
CREATE INDEX idx_ideas_due_date ON ideas(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_actions_idea_id ON actions(idea_id);
CREATE INDEX idx_resources_user_id ON resources(user_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_alerts ENABLE ROW LEVEL SECURITY;

-- TEMPLATES POLICIES
CREATE POLICY "Users can view their own templates and system templates"
    ON templates FOR SELECT
    USING (user_id = auth.uid() OR is_system = true);

CREATE POLICY "Users can create their own templates"
    ON templates FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_system = false);

CREATE POLICY "Users can update their own templates"
    ON templates FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
    ON templates FOR DELETE
    USING (user_id = auth.uid());

-- CATEGORIES POLICIES
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own categories"
    ON categories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (user_id = auth.uid());

-- IDEAS POLICIES
CREATE POLICY "Users can view their own ideas"
    ON ideas FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own ideas"
    ON ideas FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ideas"
    ON ideas FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own ideas"
    ON ideas FOR DELETE
    USING (user_id = auth.uid());

-- RESOURCES POLICIES
CREATE POLICY "Users can view their own resources"
    ON resources FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own resources"
    ON resources FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own resources"
    ON resources FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own resources"
    ON resources FOR DELETE
    USING (user_id = auth.uid());

-- ACTIONS POLICIES (via ideas ownership)
CREATE POLICY "Users can view actions for their own ideas"
    ON actions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM ideas WHERE ideas.id = actions.idea_id AND ideas.user_id = auth.uid()
    ));

CREATE POLICY "Users can create actions for their own ideas"
    ON actions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM ideas WHERE ideas.id = actions.idea_id AND ideas.user_id = auth.uid()
    ));

CREATE POLICY "Users can update actions for their own ideas"
    ON actions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM ideas WHERE ideas.id = actions.idea_id AND ideas.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete actions for their own ideas"
    ON actions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM ideas WHERE ideas.id = actions.idea_id AND ideas.user_id = auth.uid()
    ));

-- Similar policies for other junction/child tables
-- (idea_attachments, action_updates, action_attachments, alerts)
-- Simplified: inherit from parent table policies

CREATE POLICY "Users can manage idea attachments for their ideas"
    ON idea_attachments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM ideas WHERE ideas.id = idea_attachments.idea_id AND ideas.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage action updates for their actions"
    ON action_updates FOR ALL
    USING (EXISTS (
        SELECT 1 FROM actions
        JOIN ideas ON ideas.id = actions.idea_id
        WHERE actions.id = action_updates.action_id AND ideas.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage action attachments for their actions"
    ON action_attachments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM actions
        JOIN ideas ON ideas.id = actions.idea_id
        WHERE actions.id = action_attachments.action_id AND ideas.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage idea alerts for their ideas"
    ON idea_alerts FOR ALL
    USING (EXISTS (
        SELECT 1 FROM ideas WHERE ideas.id = idea_alerts.idea_id AND ideas.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage action alerts for their actions"
    ON action_alerts FOR ALL
    USING (EXISTS (
        SELECT 1 FROM actions
        JOIN ideas ON ideas.id = actions.idea_id
        WHERE actions.id = action_alerts.action_id AND ideas.user_id = auth.uid()
    ));

-- Stock prices table is public read (no user_id)
ALTER TABLE daily_stock_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stock prices"
    ON daily_stock_prices FOR SELECT
    USING (true);
