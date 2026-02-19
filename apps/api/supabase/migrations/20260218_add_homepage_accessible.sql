-- Add homepage_accessible column to track whether the merchant's homepage is reachable
ALTER TABLE scan_accessibility ADD COLUMN IF NOT EXISTS homepage_accessible BOOLEAN DEFAULT false;
