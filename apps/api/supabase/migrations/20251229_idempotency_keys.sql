-- ============================================
-- Epic 27: Story 27.6 - Idempotency Key Infrastructure
-- ============================================
-- Prevent duplicate transactions from partner retries
-- by storing request fingerprints and returning cached responses.
--
-- Usage:
-- - Partners send `Idempotency-Key` header on POST/PUT/PATCH requests
-- - Middleware stores request hash + response for 24 hours
-- - Duplicate requests return cached response instead of re-executing

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Key identification
  idempotency_key TEXT NOT NULL,
  
  -- Request fingerprint (hash of method + path + body)
  request_hash TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_method TEXT NOT NULL,
  
  -- Cached response
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  response_headers JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Ensure unique keys per tenant
  UNIQUE(tenant_id, idempotency_key)
);

-- Index for fast lookups by tenant + key
CREATE INDEX IF NOT EXISTS idx_idempotency_tenant_key 
ON idempotency_keys(tenant_id, idempotency_key);

-- Index for cleanup of expired keys
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry 
ON idempotency_keys(expires_at) 
WHERE expires_at < NOW();

-- Index for request hash verification
CREATE INDEX IF NOT EXISTS idx_idempotency_request_hash 
ON idempotency_keys(tenant_id, idempotency_key, request_hash);

-- Enable RLS
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant isolation
CREATE POLICY idempotency_keys_tenant_select ON idempotency_keys
  FOR SELECT USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY idempotency_keys_tenant_insert ON idempotency_keys
  FOR INSERT WITH CHECK (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY idempotency_keys_tenant_delete ON idempotency_keys
  FOR DELETE USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Allow service role full access (for API server)
CREATE POLICY idempotency_keys_service_all ON idempotency_keys
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Function to cleanup expired idempotency keys
-- Should be called periodically (e.g., every hour)
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_keys
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup
  INSERT INTO audit_log (
    tenant_id,
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    actor_name,
    metadata
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system',
    'idempotency_cleanup',
    'cleanup',
    'system',
    '00000000-0000-0000-0000-000000000000',
    'system',
    jsonb_build_object('deleted_count', deleted_count, 'timestamp', NOW())
  );
  
  RETURN deleted_count;
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys to prevent duplicate API requests. Keys expire after 24 hours.';
COMMENT ON COLUMN idempotency_keys.request_hash IS 'SHA-256 hash of method + path + body to detect request mismatches';
COMMENT ON COLUMN idempotency_keys.expires_at IS 'Keys auto-expire after 24 hours for cleanup';

