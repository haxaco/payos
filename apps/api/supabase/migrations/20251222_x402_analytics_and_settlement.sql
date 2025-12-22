-- Migration: x402 Analytics and Settlement Configuration
-- Description: Add RPC function for time-series revenue queries and settlement config table
-- Date: 2025-12-22

-- ============================================
-- Settlement Configuration Table
-- ============================================

CREATE TABLE IF NOT EXISTS settlement_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Fee configuration for x402 transactions
  x402_fee_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (x402_fee_type IN ('percentage', 'fixed', 'hybrid')),
  x402_fee_percentage DECIMAL(5,4) DEFAULT 0.0290, -- e.g., 0.0290 = 2.9%
  x402_fee_fixed DECIMAL(20,8) DEFAULT 0, -- e.g., 0.30 USDC
  x402_fee_currency VARCHAR(10) DEFAULT 'USDC',
  
  -- Fee configuration for other transaction types (future)
  internal_fee_percentage DECIMAL(5,4) DEFAULT 0,
  cross_border_fee_percentage DECIMAL(5,4) DEFAULT 0,
  
  -- Settlement preferences
  auto_settlement_enabled BOOLEAN DEFAULT TRUE,
  settlement_threshold DECIMAL(20,8), -- Min amount to trigger settlement
  settlement_schedule VARCHAR(20) DEFAULT 'immediate', -- immediate, daily, weekly
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_settlement_config_tenant ON settlement_config(tenant_id);

-- RLS Policies
ALTER TABLE settlement_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY settlement_config_tenant_isolation ON settlement_config
  FOR ALL USING (tenant_id = (SELECT auth.jwt()->>'tenant_id')::uuid);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_settlement_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settlement_config_updated_at
  BEFORE UPDATE ON settlement_config
  FOR EACH ROW
  EXECUTE FUNCTION update_settlement_config_updated_at();

-- ============================================
-- Default Settlement Config for Existing Tenants
-- ============================================

-- Insert default config for all existing tenants
INSERT INTO settlement_config (tenant_id, x402_fee_type, x402_fee_percentage, x402_fee_fixed)
SELECT id, 'percentage', 0.0290, 0
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- RPC Function: x402 Revenue Time Series
-- ============================================

CREATE OR REPLACE FUNCTION get_x402_revenue_timeseries(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_trunc_by TEXT DEFAULT 'day',
  p_endpoint_id UUID DEFAULT NULL,
  p_currency VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  revenue NUMERIC,
  fees NUMERIC,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC(p_trunc_by, t.created_at) AS time_bucket,
    COALESCE(SUM(t.amount), 0) AS revenue,
    COALESCE(SUM(t.fee_amount), 0) AS fees,
    COUNT(*) AS transaction_count
  FROM transfers t
  WHERE t.tenant_id = p_tenant_id
    AND t.type = 'x402'
    AND t.status = 'completed'
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date
    AND (p_endpoint_id IS NULL OR t.x402_metadata->>'endpoint_id' = p_endpoint_id::text)
    AND (p_currency IS NULL OR t.currency = p_currency)
  GROUP BY time_bucket
  ORDER BY time_bucket ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_x402_revenue_timeseries TO authenticated;
GRANT EXECUTE ON FUNCTION get_x402_revenue_timeseries TO service_role;

-- ============================================
-- Function: Calculate x402 Fee
-- ============================================

CREATE OR REPLACE FUNCTION calculate_x402_fee(
  p_tenant_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_config RECORD;
  v_fee NUMERIC;
BEGIN
  -- Get tenant's fee configuration
  SELECT * INTO v_config
  FROM settlement_config
  WHERE tenant_id = p_tenant_id;
  
  -- If no config found, use default
  IF v_config IS NULL THEN
    v_config.x402_fee_type := 'percentage';
    v_config.x402_fee_percentage := 0.0290;
    v_config.x402_fee_fixed := 0;
  END IF;
  
  -- Calculate fee based on type
  CASE v_config.x402_fee_type
    WHEN 'percentage' THEN
      v_fee := p_amount * v_config.x402_fee_percentage;
    WHEN 'fixed' THEN
      v_fee := v_config.x402_fee_fixed;
    WHEN 'hybrid' THEN
      v_fee := (p_amount * v_config.x402_fee_percentage) + v_config.x402_fee_fixed;
    ELSE
      v_fee := 0;
  END CASE;
  
  -- Ensure fee doesn't exceed amount
  IF v_fee > p_amount THEN
    v_fee := p_amount;
  END IF;
  
  RETURN ROUND(v_fee, 8);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_x402_fee TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_x402_fee TO service_role;

-- ============================================
-- Helper View: x402 Endpoint Performance
-- ============================================

CREATE OR REPLACE VIEW x402_endpoint_performance AS
SELECT 
  e.id AS endpoint_id,
  e.tenant_id,
  e.name AS endpoint_name,
  e.path,
  e.status,
  COUNT(DISTINCT t.id) AS total_calls,
  COUNT(DISTINCT t.from_account_id) AS unique_payers,
  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) AS total_revenue,
  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.fee_amount ELSE 0 END), 0) AS total_fees,
  COALESCE(AVG(CASE WHEN t.status = 'completed' THEN t.amount ELSE NULL END), 0) AS avg_transaction_value,
  COALESCE(SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_transactions,
  e.created_at AS endpoint_created_at,
  MAX(t.created_at) AS last_transaction_at
FROM x402_endpoints e
LEFT JOIN transfers t ON t.type = 'x402' 
  AND t.tenant_id = e.tenant_id
  AND t.x402_metadata->>'endpoint_id' = e.id::text
GROUP BY e.id, e.tenant_id, e.name, e.path, e.status, e.created_at;

-- Grant access to view
GRANT SELECT ON x402_endpoint_performance TO authenticated;
GRANT SELECT ON x402_endpoint_performance TO service_role;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE settlement_config IS 'Configuration for settlement fees and preferences per tenant';
COMMENT ON FUNCTION get_x402_revenue_timeseries IS 'Returns time-bucketed revenue data for x402 transactions';
COMMENT ON FUNCTION calculate_x402_fee IS 'Calculates the platform fee for an x402 transaction based on tenant configuration';
COMMENT ON VIEW x402_endpoint_performance IS 'Aggregated performance metrics for x402 endpoints';

