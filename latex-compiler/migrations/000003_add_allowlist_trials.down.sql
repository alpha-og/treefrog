-- Remove coupon redemptions table
DROP INDEX IF EXISTS idx_redemptions_coupon;
DROP INDEX IF EXISTS idx_redemptions_user;
DROP TABLE IF EXISTS coupon_redemptions;

-- Remove trials table
DROP INDEX IF EXISTS idx_trials_ends;
DROP INDEX IF EXISTS idx_trials_user;
DROP TABLE IF EXISTS trials;

-- Remove allowlist table
DROP INDEX IF EXISTS idx_allowlist_active;
DROP INDEX IF EXISTS idx_allowlist_email;
DROP TABLE IF EXISTS allowlist;

-- Note: SQLite doesn't support DROP COLUMN, so we recreate the table
-- In production, this would need proper handling
