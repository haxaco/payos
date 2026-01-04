-- Migration: Baseline settlement_holidays table
-- Description: Documents settlement_holidays table that was created outside migration system
-- Date: 2026-01-01
--
-- Note: This table already exists in the database. This migration ensures it's
-- properly tracked in the migration history with CREATE TABLE IF NOT EXISTS.
-- RLS and policies were added in migration: 20260101_fix_security_issues_rls_and_views

-- ============================================
-- Settlement Holidays Table
-- ============================================

CREATE TABLE IF NOT EXISTS settlement_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  affected_rails TEXT[] DEFAULT '{}',
  is_full_day BOOLEAN DEFAULT TRUE,
  closed_from TIME,
  closed_until TIME,
  year INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups by country and date
CREATE INDEX IF NOT EXISTS idx_settlement_holidays_country_date 
  ON settlement_holidays(country_code, holiday_date);

-- Index for year-based queries
CREATE INDEX IF NOT EXISTS idx_settlement_holidays_year 
  ON settlement_holidays(year) WHERE year IS NOT NULL;

-- Unique constraint to prevent duplicate holidays
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_holidays_unique 
  ON settlement_holidays(country_code, holiday_date);

-- Enable RLS (idempotent - already done in 20260101_fix_security_issues_rls_and_views)
ALTER TABLE settlement_holidays ENABLE ROW LEVEL SECURITY;

-- Policies (already created in 20260101_fix_security_issues_rls_and_views, but included for reference)
-- CREATE POLICY settlement_holidays_read_all ON settlement_holidays FOR SELECT TO authenticated USING (true);
-- CREATE POLICY settlement_holidays_service_role_all ON settlement_holidays FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant permissions (already done in fix migration, but included for completeness)
GRANT SELECT ON settlement_holidays TO authenticated;
GRANT ALL ON settlement_holidays TO service_role;

-- Comments
COMMENT ON TABLE settlement_holidays IS 'Banking holiday calendar for different countries and settlement rails';
COMMENT ON COLUMN settlement_holidays.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, BR, GB)';
COMMENT ON COLUMN settlement_holidays.affected_rails IS 'Array of rail names affected by this holiday (empty means all rails)';
COMMENT ON COLUMN settlement_holidays.is_full_day IS 'Whether holiday affects the entire day or just specific hours';
COMMENT ON COLUMN settlement_holidays.closed_from IS 'Start time for partial-day holidays';
COMMENT ON COLUMN settlement_holidays.closed_until IS 'End time for partial-day holidays';

