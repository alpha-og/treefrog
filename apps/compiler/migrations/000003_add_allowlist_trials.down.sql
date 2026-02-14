-- Drop added tables and columns
DROP TABLE IF EXISTS coupon_redemptions;
DROP TABLE IF EXISTS trials;
DROP TABLE IF EXISTS allowlist;
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
