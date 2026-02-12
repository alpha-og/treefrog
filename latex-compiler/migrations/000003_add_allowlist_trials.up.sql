-- Add new coupon fields
ALTER TABLE coupons ADD COLUMN type TEXT DEFAULT 'discount';
ALTER TABLE coupons ADD COLUMN trial_days INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN tier_upgrade TEXT DEFAULT '';
ALTER TABLE coupons ADD COLUMN one_time_use BOOLEAN DEFAULT FALSE;

-- Allowlist table
CREATE TABLE IF NOT EXISTS allowlist (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    tier TEXT DEFAULT 'pro',
    reason TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE INDEX idx_allowlist_email ON allowlist(email);
CREATE INDEX idx_allowlist_active ON allowlist(is_active);

-- Trials table
CREATE TABLE IF NOT EXISTS trials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tier TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP NOT NULL,
    coupon_code TEXT,
    converted_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_trials_user ON trials(user_id);
CREATE INDEX idx_trials_ends ON trials(ends_at);

-- Coupon redemptions table (for one-time use tracking)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    coupon_id TEXT NOT NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    UNIQUE(user_id, coupon_id)
);

CREATE INDEX idx_redemptions_user ON coupon_redemptions(user_id);
CREATE INDEX idx_redemptions_coupon ON coupon_redemptions(coupon_id);
