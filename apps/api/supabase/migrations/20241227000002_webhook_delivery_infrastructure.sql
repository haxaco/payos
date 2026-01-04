-- Migration: Webhook Delivery Infrastructure
-- Epic 17, Story 17.0b
-- Robust webhook delivery with retries, DLQ, and HMAC signatures

-- ============================================
-- 1. Webhook Endpoints Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Configuration
  url TEXT NOT NULL,
  name TEXT,
  description TEXT,
  
  -- Event subscription (supports wildcards: 'x402.*', 'transfer.*', '*')
  events TEXT[] NOT NULL DEFAULT '{}',
  
  -- Security
  secret_hash TEXT NOT NULL,            -- SHA-256 hash of webhook secret
  secret_prefix VARCHAR(12),            -- First 12 chars for display (e.g., "whsec_abc...")
  
  -- Status & Health
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'failing')),
  consecutive_failures INT DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(tenant_id, status) 
  WHERE status = 'active';

-- RLS
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_endpoints_tenant_policy ON webhook_endpoints
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('app.tenant_id', true)::uuid,
      (SELECT (auth.jwt()->>'tenant_id')::uuid)
    )
  );

COMMENT ON TABLE webhook_endpoints IS 
  'Webhook endpoint configuration per tenant. Supports event filtering and HMAC signing.';

-- ============================================
-- 2. Webhook Deliveries Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE SET NULL,
  
  -- Target (stored separately in case endpoint is deleted)
  endpoint_url TEXT NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL,             -- 'x402.payment.completed', 'transfer.completed', etc.
  event_id UUID,                        -- Reference to source event (transfer_id, etc.)
  idempotency_key TEXT,                 -- Prevent duplicate deliveries
  
  -- Payload
  payload JSONB NOT NULL,
  signature TEXT,                       -- HMAC-SHA256 signature: "t=timestamp,v1=signature"
  
  -- Delivery tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Queued for delivery
    'processing',   -- Currently being delivered
    'delivered',    -- Successfully delivered (2xx response)
    'failed',       -- Failed, will retry
    'dlq'           -- Dead letter queue (max retries exceeded)
  )),
  
  -- Retry logic
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  
  -- Response tracking
  last_response_code INT,
  last_response_body TEXT,              -- Truncated to 1000 chars
  last_response_time_ms INT,            -- Response latency
  last_attempt_at TIMESTAMPTZ,
  
  -- Dead letter queue
  dlq_at TIMESTAMPTZ,
  dlq_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Index for processing pending deliveries
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(created_at) 
  WHERE status = 'pending';

-- Index for retry processing
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) 
  WHERE status = 'failed' AND attempts < max_attempts;

-- Index for tenant queries
CREATE INDEX idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id, created_at DESC);

-- Index for endpoint queries
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id, created_at DESC);

-- Index for idempotency
CREATE UNIQUE INDEX idx_webhook_deliveries_idempotency 
  ON webhook_deliveries(tenant_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_deliveries_tenant_policy ON webhook_deliveries
  FOR ALL USING (
    tenant_id = COALESCE(
      current_setting('app.tenant_id', true)::uuid,
      (SELECT (auth.jwt()->>'tenant_id')::uuid)
    )
  );

COMMENT ON TABLE webhook_deliveries IS 
  'Tracks all webhook delivery attempts with retry logic and dead letter queue support.';

-- ============================================
-- 3. Helper Functions
-- ============================================

-- Function to calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION calculate_webhook_retry_at(attempts INT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  -- Retry delays: 1min, 5min, 15min, 1hr, 24hr
  delays INT[] := ARRAY[60, 300, 900, 3600, 86400];
  delay_seconds INT;
BEGIN
  IF attempts >= array_length(delays, 1) THEN
    delay_seconds := delays[array_length(delays, 1)];
  ELSE
    delay_seconds := delays[attempts + 1];
  END IF;
  
  RETURN NOW() + (delay_seconds || ' seconds')::INTERVAL;
END;
$$;

-- Function to queue a webhook delivery
CREATE OR REPLACE FUNCTION queue_webhook_delivery(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_event_id UUID,
  p_payload JSONB,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_endpoint RECORD;
  v_delivery_id UUID;
BEGIN
  -- Find all active endpoints subscribed to this event type
  FOR v_endpoint IN
    SELECT id, url, secret_hash
    FROM webhook_endpoints
    WHERE tenant_id = p_tenant_id
      AND status = 'active'
      AND (
        '*' = ANY(events)
        OR p_event_type = ANY(events)
        OR EXISTS (
          SELECT 1 FROM unnest(events) e 
          WHERE p_event_type LIKE replace(e, '*', '%')
        )
      )
  LOOP
    -- Insert delivery record
    INSERT INTO webhook_deliveries (
      tenant_id,
      endpoint_id,
      endpoint_url,
      event_type,
      event_id,
      idempotency_key,
      payload,
      status
    ) VALUES (
      p_tenant_id,
      v_endpoint.id,
      v_endpoint.url,
      p_event_type,
      p_event_id,
      p_idempotency_key,
      p_payload,
      'pending'
    )
    ON CONFLICT (tenant_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_delivery_id;
    
    IF v_delivery_id IS NOT NULL THEN
      RETURN NEXT v_delivery_id;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION queue_webhook_delivery IS 
  'Queues webhook delivery to all subscribed endpoints for a given event type.';

-- ============================================
-- 4. Trigger to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_webhook_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_endpoints_updated_at();

