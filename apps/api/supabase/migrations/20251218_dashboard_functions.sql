-- ============================================
-- Migration: Dashboard & Treasury Functions
-- Purpose: Aggregate queries for dashboard and treasury reporting
-- Date: 2025-12-18
-- ============================================

-- ============================================
-- Function: Get Dashboard Account Statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_dashboard_account_stats(p_tenant_id UUID)
RETURNS TABLE(
  total_accounts BIGINT,
  verified_accounts BIGINT,
  new_accounts_30d BIGINT,
  business_accounts BIGINT,
  person_accounts BIGINT
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE verification_status = 'verified')::BIGINT,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::BIGINT,
    COUNT(*) FILTER (WHERE type = 'business')::BIGINT,
    COUNT(*) FILTER (WHERE type = 'person')::BIGINT
  FROM accounts 
  WHERE tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION get_dashboard_account_stats IS 'Returns aggregated account statistics for dashboard';

-- ============================================
-- Function: Get Monthly Transaction Volume
-- ============================================
CREATE OR REPLACE FUNCTION get_monthly_volume(
  p_tenant_id UUID,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE(
  month TIMESTAMP WITH TIME ZONE,
  total_volume NUMERIC,
  transaction_count BIGINT,
  us_arg_volume NUMERIC,
  us_col_volume NUMERIC,
  us_mex_volume NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', created_at)::TIMESTAMP WITH TIME ZONE as month,
    COALESCE(SUM(amount), 0) as total_volume,
    COUNT(*)::BIGINT as transaction_count,
    COALESCE(SUM(amount) FILTER (WHERE corridor_id LIKE 'US-ARG%'), 0) as us_arg_volume,
    COALESCE(SUM(amount) FILTER (WHERE corridor_id LIKE 'US-COL%'), 0) as us_col_volume,
    COALESCE(SUM(amount) FILTER (WHERE corridor_id LIKE 'US-MEX%'), 0) as us_mex_volume
  FROM transfers
  WHERE tenant_id = p_tenant_id 
    AND created_at > NOW() - INTERVAL '1 month' * p_months
    AND status = 'completed'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month DESC;
END;
$$;

COMMENT ON FUNCTION get_monthly_volume IS 'Returns monthly transaction volume with corridor breakdown';

-- ============================================
-- Function: Get Treasury Currency Summary
-- ============================================
CREATE OR REPLACE FUNCTION get_treasury_currency_summary(p_tenant_id UUID)
RETURNS TABLE(
  currency TEXT,
  total_balance NUMERIC,
  available_balance NUMERIC,
  balance_in_streams NUMERIC,
  account_count BIGINT,
  health_status TEXT,
  stream_utilization_pct NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.currency,
    COALESCE(SUM(a.balance_total), 0) as total_balance,
    COALESCE(SUM(a.balance_available), 0) as available_balance,
    COALESCE(SUM(a.balance_in_streams), 0) as balance_in_streams,
    COUNT(*)::BIGINT as account_count,
    
    -- Health status based on available balance thresholds
    CASE
      WHEN COALESCE(SUM(a.balance_available), 0) > 2000000 THEN 'healthy'
      WHEN COALESCE(SUM(a.balance_available), 0) > 500000 THEN 'adequate'
      WHEN COALESCE(SUM(a.balance_available), 0) > 100000 THEN 'low'
      ELSE 'critical'
    END as health_status,
    
    -- Stream utilization percentage
    ROUND(
      (COALESCE(SUM(a.balance_in_streams), 0) / NULLIF(SUM(a.balance_total), 0) * 100)::NUMERIC, 
      2
    ) as stream_utilization_pct
    
  FROM accounts a
  WHERE a.tenant_id = p_tenant_id
  GROUP BY a.currency
  ORDER BY total_balance DESC;
END;
$$;

COMMENT ON FUNCTION get_treasury_currency_summary IS 'Returns aggregated balance summary by currency with health status';

-- ============================================
-- Function: Get Stream Netflow
-- ============================================
CREATE OR REPLACE FUNCTION get_stream_netflow(p_tenant_id UUID)
RETURNS TABLE(
  inflow_stream_count BIGINT,
  total_inflow_per_month NUMERIC,
  outflow_stream_count BIGINT,
  total_outflow_per_month NUMERIC,
  net_flow_per_month NUMERIC,
  net_flow_per_day NUMERIC,
  net_flow_per_hour NUMERIC
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH tenant_accounts AS (
    SELECT id FROM accounts WHERE tenant_id = p_tenant_id
  ),
  inflows AS (
    SELECT 
      COUNT(*)::BIGINT as stream_count,
      COALESCE(SUM(flow_rate_per_month), 0) as total_inflow
    FROM streams
    WHERE tenant_id = p_tenant_id 
      AND status = 'active'
      AND receiver_account_id IN (SELECT id FROM tenant_accounts)
  ),
  outflows AS (
    SELECT 
      COUNT(*)::BIGINT as stream_count,
      COALESCE(SUM(flow_rate_per_month), 0) as total_outflow
    FROM streams
    WHERE tenant_id = p_tenant_id
      AND status = 'active'
      AND sender_account_id IN (SELECT id FROM tenant_accounts)
  )
  SELECT 
    COALESCE(i.stream_count, 0)::BIGINT,
    COALESCE(i.total_inflow, 0),
    COALESCE(o.stream_count, 0)::BIGINT,
    COALESCE(o.total_outflow, 0),
    COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0),
    (COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0)) / 30,
    (COALESCE(i.total_inflow, 0) - COALESCE(o.total_outflow, 0)) / 30 / 24
  FROM inflows i
  CROSS JOIN outflows o;
END;
$$;

COMMENT ON FUNCTION get_stream_netflow IS 'Returns stream netflow analysis (inflows vs outflows)';

-- ============================================
-- Grant Execute Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_dashboard_account_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_volume(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_treasury_currency_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stream_netflow(UUID) TO authenticated;


