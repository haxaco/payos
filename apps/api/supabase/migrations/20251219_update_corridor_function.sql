-- ============================================
-- Migration: Update Corridor Function
-- Purpose: Update get_monthly_volume to match actual corridor_id format
-- Date: 2025-12-19
-- ============================================

-- Update function to match actual corridor_id format (USD-MXN, USD-EUR, etc.)
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
    -- Match various formats: USD-ARS, US-ARG, USD-ARG, etc.
    COALESCE(SUM(amount) FILTER (
      WHERE corridor_id LIKE '%ARG%' 
         OR corridor_id LIKE '%ARS%'
         OR destination_currency = 'ARS'
    ), 0) as us_arg_volume,
    -- Match various formats: USD-COP, US-COL, USD-COL, etc.
    COALESCE(SUM(amount) FILTER (
      WHERE corridor_id LIKE '%COL%' 
         OR corridor_id LIKE '%COP%'
         OR destination_currency = 'COP'
    ), 0) as us_col_volume,
    -- Match various formats: USD-MXN, US-MEX, USD-MEX, etc.
    COALESCE(SUM(amount) FILTER (
      WHERE corridor_id LIKE '%MEX%' 
         OR corridor_id LIKE '%MXN%'
         OR destination_currency = 'MXN'
    ), 0) as us_mex_volume
  FROM transfers
  WHERE tenant_id = p_tenant_id 
    AND created_at > NOW() - INTERVAL '1 month' * p_months
    AND status = 'completed'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month DESC;
END;
$$;

COMMENT ON FUNCTION get_monthly_volume IS 'Returns monthly transaction volume with corridor breakdown (updated to match actual corridor_id formats)';


