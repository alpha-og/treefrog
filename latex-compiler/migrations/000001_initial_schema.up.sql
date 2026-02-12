-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    clerk_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT,
    tier TEXT DEFAULT 'free',
    storage_used_bytes INTEGER DEFAULT 0,
    subscription_canceled_at TIMESTAMP,
    subscription_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_razorpay_customer ON users(razorpay_customer_id);

-- Builds table (FIXED: uses users.id, not users.clerk_id)
CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    engine TEXT DEFAULT 'pdflatex',
    main_file TEXT,
    dir_path TEXT,
    pdf_path TEXT,
    synctex_path TEXT,
    build_log TEXT,
    error_message TEXT,
    shell_escape BOOLEAN DEFAULT FALSE,
    storage_bytes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_builds_user ON builds(user_id);
CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_expires ON builds(expires_at);
CREATE INDEX idx_builds_created ON builds(created_at);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    plan_id TEXT NOT NULL,
    plan_name TEXT,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    discount_percent INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
