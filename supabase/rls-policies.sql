-- Row Level Security (RLS) Policies for Supabase
-- Run this in Supabase SQL Editor after enabling RLS

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Helper function to get Clerk user ID from JWT
-- Note: Supabase validates Clerk JWTs using the JWT secret
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS TEXT AS $$
BEGIN
    -- Clerk stores user ID in the 'sub' claim
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'sub',
        current_setting('request.jwt.claims', true)::json->'clerk_user_id'->>'id'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (clerk_id = auth.clerk_user_id());

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (clerk_id = auth.clerk_user_id())
    WITH CHECK (clerk_id = auth.clerk_user_id());

-- Users can insert their own profile (for first-time sync)
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (clerk_id = auth.clerk_user_id());

-- Service role can do everything (for backend/webhooks)
CREATE POLICY "Service role full access on users"
    ON users FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- BUILDS TABLE POLICIES
-- ============================================

-- Users can view their own builds
CREATE POLICY "Users can view own builds"
    ON builds FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Users can insert builds (backend handles this primarily)
CREATE POLICY "Users can insert own builds"
    ON builds FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Users can update their own builds (limited - backend primarily handles this)
CREATE POLICY "Users can update own builds"
    ON builds FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Users can delete their own builds
CREATE POLICY "Users can delete own builds"
    ON builds FOR DELETE
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on builds"
    ON builds FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- INVOICES TABLE POLICIES
-- ============================================

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
    ON invoices FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Only service role can insert/update invoices
CREATE POLICY "Service role full access on invoices"
    ON invoices FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- COUPONS TABLE POLICIES
-- ============================================

-- Users can view active coupons (for validation)
CREATE POLICY "Users can view active coupons"
    ON coupons FOR SELECT
    USING (is_active = true);

-- Service role full access
CREATE POLICY "Service role full access on coupons"
    ON coupons FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- COUPON REDEMPTIONS TABLE POLICIES
-- ============================================

-- Users can view their own redemptions
CREATE POLICY "Users can view own redemptions"
    ON coupon_redemptions FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on redemptions"
    ON coupon_redemptions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on audit_logs"
    ON audit_logs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- USER PREFERENCES TABLE POLICIES
-- ============================================

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM users WHERE clerk_id = auth.clerk_user_id()
        )
    );

-- Service role full access
CREATE POLICY "Service role full access on preferences"
    ON user_preferences FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- ADDITIONAL HELPER FUNCTIONS
-- ============================================

-- Function to get or create user from Clerk ID
CREATE OR REPLACE FUNCTION get_or_create_user(
    p_clerk_id TEXT,
    p_email TEXT,
    p_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to get existing user
    SELECT id INTO v_user_id FROM users WHERE clerk_id = p_clerk_id;
    
    -- If not found, create new user
    IF v_user_id IS NULL THEN
        INSERT INTO users (clerk_id, email, name)
        VALUES (p_clerk_id, p_email, p_name)
        RETURNING id INTO v_user_id;
        
        -- Create default preferences
        INSERT INTO user_preferences (user_id) VALUES (v_user_id);
    END IF;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create a build
CREATE OR REPLACE FUNCTION can_create_build(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_tier TEXT;
    v_monthly_builds INTEGER;
    v_active_builds INTEGER;
    v_monthly_limit INTEGER;
    v_concurrent_limit INTEGER;
    v_subscription_paused BOOLEAN;
    v_result JSONB;
BEGIN
    -- Get user info
    SELECT tier, subscription_paused INTO v_tier, v_subscription_paused
    FROM users WHERE id = p_user_id;
    
    IF v_subscription_paused THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'subscription_paused',
            'message', 'Your subscription is paused. Please update payment method.'
        );
    END IF;
    
    -- Get limits based on tier
    v_monthly_limit := CASE v_tier
        WHEN 'pro' THEN 500
        WHEN 'enterprise' THEN -1
        ELSE 50
    END;
    
    v_concurrent_limit := CASE v_tier
        WHEN 'pro' THEN 10
        WHEN 'enterprise' THEN 50
        ELSE 2
    END;
    
    -- Get current usage
    SELECT 
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())),
        COUNT(*) FILTER (WHERE status IN ('pending', 'compiling'))
    INTO v_monthly_builds, v_active_builds
    FROM builds WHERE user_id = p_user_id AND deleted_at IS NULL;
    
    -- Check limits
    IF v_monthly_limit > 0 AND v_monthly_builds >= v_monthly_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'monthly_limit_exceeded',
            'message', format('Monthly build limit reached: %s/%s', v_monthly_builds, v_monthly_limit),
            'used', v_monthly_builds,
            'limit', v_monthly_limit
        );
    END IF;
    
    IF v_active_builds >= v_concurrent_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'concurrent_limit_exceeded',
            'message', format('Concurrent build limit reached: %s/%s', v_active_builds, v_concurrent_limit),
            'used', v_active_builds,
            'limit', v_concurrent_limit
        );
    END IF;
    
    RETURN jsonb_build_object(
        'allowed', true,
        'tier', v_tier,
        'monthly_used', v_monthly_builds,
        'monthly_limit', v_monthly_limit,
        'concurrent_used', v_active_builds,
        'concurrent_limit', v_concurrent_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user usage stats
CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tier', u.tier,
        'monthly_used', COALESCE(bs.monthly_builds, 0),
        'monthly_limit', CASE u.tier
            WHEN 'pro' THEN 500
            WHEN 'enterprise' THEN -1
            ELSE 50
        END,
        'concurrent_used', COALESCE(bs.active_builds, 0),
        'concurrent_limit', CASE u.tier
            WHEN 'pro' THEN 10
            WHEN 'enterprise' THEN 50
            ELSE 2
        END,
        'storage_used_gb', ROUND(CAST(COALESCE(bs.total_storage_bytes, 0) AS numeric) / 1073741824, 2),
        'storage_limit_gb', CASE u.tier
            WHEN 'pro' THEN 10
            WHEN 'enterprise' THEN 100
            ELSE 1
        END,
        'monthly_reset_at', (date_trunc('month', NOW()) + interval '1 month')::timestamptz
    ) INTO v_result
    FROM users u
    LEFT JOIN build_stats bs ON u.id = bs.user_id
    WHERE u.id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
