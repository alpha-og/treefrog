-- PostgreSQL Schema for Supabase with Supabase Auth
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    storage_used_bytes BIGINT DEFAULT 0,
    subscription_canceled_at TIMESTAMPTZ,
    subscription_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer ON users(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Builds table
CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'compiling', 'retrying', 'completed', 'failed', 'expired', 'deleted')),
    engine TEXT DEFAULT 'pdflatex' CHECK (engine IN ('pdflatex', 'xelatex', 'lualatex')),
    main_file TEXT,
    dir_path TEXT,
    pdf_path TEXT,
    synctex_path TEXT,
    build_log TEXT,
    error_message TEXT,
    shell_escape BOOLEAN DEFAULT FALSE,
    storage_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_builds_user ON builds(user_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_expires ON builds(expires_at);
CREATE INDEX IF NOT EXISTS idx_builds_created ON builds(created_at);
CREATE INDEX IF NOT EXISTS idx_builds_user_created ON builds(user_id, created_at DESC);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'discount' CHECK (type IN ('discount', 'trial', 'upgrade')),
    plan_id TEXT,
    plan_name TEXT,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    trial_days INTEGER DEFAULT 0,
    tier_upgrade TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    one_time_use BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_type ON coupons(type);

-- Allowlist table
CREATE TABLE IF NOT EXISTS allowlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    tier TEXT DEFAULT 'pro' CHECK (tier IN ('free', 'pro', 'enterprise')),
    reason TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_allowlist_email ON allowlist(email);
CREATE INDEX IF NOT EXISTS idx_allowlist_active ON allowlist(is_active);

-- Trials table
CREATE TABLE IF NOT EXISTS trials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT DEFAULT 'pro',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    coupon_code TEXT,
    converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trials_user ON trials(user_id);
CREATE INDEX IF NOT EXISTS idx_trials_ends ON trials(ends_at);

-- Coupon redemptions
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, user_id)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    razorpay_invoice_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled', 'refunded')),
    invoice_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_razorpay ON invoices(razorpay_invoice_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_engine TEXT DEFAULT 'pdflatex',
    editor_theme TEXT DEFAULT 'system',
    email_notifications BOOLEAN DEFAULT TRUE,
    build_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_builds_updated_at ON builds;
CREATE TRIGGER update_builds_updated_at
    BEFORE UPDATE ON builds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
    );
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- View for build statistics
CREATE OR REPLACE VIEW build_stats AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_builds,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_builds,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as monthly_builds,
    COUNT(*) FILTER (WHERE status IN ('pending', 'compiling')) as active_builds,
    SUM(storage_bytes) as total_storage_bytes
FROM builds
WHERE deleted_at IS NULL
GROUP BY user_id;

-- View for user dashboard
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.is_admin,
    u.tier,
    u.storage_used_bytes,
    u.subscription_paused,
    u.subscription_canceled_at,
    COALESCE(bs.completed_builds, 0) as completed_builds,
    COALESCE(bs.failed_builds, 0) as failed_builds,
    COALESCE(bs.monthly_builds, 0) as monthly_builds,
    COALESCE(bs.active_builds, 0) as active_builds
FROM users u
LEFT JOIN build_stats bs ON u.id = bs.user_id;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for builds table
CREATE POLICY "Users can view own builds"
    ON builds FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own builds"
    ON builds FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own builds"
    ON builds FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own builds"
    ON builds FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for invoices table
CREATE POLICY "Users can view own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for coupons table (read-only for users)
CREATE POLICY "Users can view active coupons"
    ON coupons FOR SELECT
    USING (is_active = true);

-- RLS Policies for allowlist table
CREATE POLICY "Anyone can check allowlist"
    ON allowlist FOR SELECT
    USING (true);

-- RLS Policies for trials table
CREATE POLICY "Users can view own trials"
    ON trials FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for user_preferences table
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audit_logs table
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for coupon_redemptions
CREATE POLICY "Users can view own redemptions"
    ON coupon_redemptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redemptions"
    ON coupon_redemptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admin policies (users with is_admin = true)
CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update all users"
    ON users FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all builds"
    ON builds FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all invoices"
    ON invoices FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage allowlist"
    ON allowlist FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can manage coupons"
    ON coupons FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- Service role policies (for backend)
-- Note: Service role bypasses RLS, so no policies needed

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
