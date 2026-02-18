-- Scanner v2: Add detection status, confidence, eligibility signals, and business model
-- These columns support richer detection methodology beyond simple detected: true/false

ALTER TABLE scan_protocol_results ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_detected';
ALTER TABLE scan_protocol_results ADD COLUMN IF NOT EXISTS confidence TEXT DEFAULT 'medium';
ALTER TABLE scan_protocol_results ADD COLUMN IF NOT EXISTS eligibility_signals JSONB DEFAULT '[]';

ALTER TABLE merchant_scans ADD COLUMN IF NOT EXISTS business_model TEXT;
