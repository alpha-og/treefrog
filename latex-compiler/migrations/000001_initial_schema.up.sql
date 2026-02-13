-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT NOT NULL UNIQUE,
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

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer ON users(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Builds table
CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'compiling', 'completed', 'failed', 'expired', 'deleted')),
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
    last_accessed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_builds_user ON builds(user_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_expires ON builds(expires_at);
CREATE INDEX IF NOT EXISTS idx_builds_created ON builds(created_at);
CREATE INDEX IF NOT EXISTS idx_builds_user_created ON builds(user_id, created_at DESC);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_builds_updated_at
    BEFORE UPDATE ON builds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
