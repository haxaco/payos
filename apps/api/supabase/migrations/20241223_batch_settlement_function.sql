-- Migration: Batch Settlement Function for x402 Performance Optimization
-- Epic 26, Story 26.3: Batch Settlement Updates
-- Created: 2024-12-23

-- Drop function if exists
DROP FUNCTION IF EXISTS settle_x402_payment(UUID, UUID, DECIMAL, DECIMAL, UUID, TEXT);

-- Create optimized batch settlement function
-- This function updates both wallet balances and marks transfer as completed in a single atomic transaction
CREATE OR REPLACE FUNCTION settle_x402_payment(
  p_consumer_wallet_id UUID,
  p_provider_wallet_id UUID,
  p_gross_amount DECIMAL,
  p_net_amount DECIMAL,
  p_transfer_id UUID,
  p_tenant_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_consumer_new_balance DECIMAL;
  v_provider_new_balance DECIMAL;
  v_result JSON;
BEGIN
  -- Update consumer wallet (deduct gross amount)
  UPDATE wallets
  SET 
    balance = balance - p_gross_amount,
    status = CASE 
      WHEN (balance - p_gross_amount) <= 0 THEN 'depleted'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_consumer_wallet_id
    AND tenant_id = p_tenant_id
  RETURNING balance INTO v_consumer_new_balance;

  -- Check if consumer wallet was found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consumer wallet not found: %', p_consumer_wallet_id;
  END IF;

  -- Update provider wallet (credit net amount)
  UPDATE wallets
  SET 
    balance = balance + p_net_amount,
    updated_at = NOW()
  WHERE id = p_provider_wallet_id
    AND tenant_id = p_tenant_id
  RETURNING balance INTO v_provider_new_balance;

  -- Check if provider wallet was found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider wallet not found: %', p_provider_wallet_id;
  END IF;

  -- Mark transfer as completed
  UPDATE transfers
  SET 
    status = 'completed',
    settled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transfer_id
    AND tenant_id = p_tenant_id;

  -- Check if transfer was found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found: %', p_transfer_id;
  END IF;

  -- Return result
  v_result := json_build_object(
    'success', true,
    'consumerNewBalance', v_consumer_new_balance,
    'providerNewBalance', v_provider_new_balance,
    'settledAt', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION settle_x402_payment(UUID, UUID, DECIMAL, DECIMAL, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_x402_payment(UUID, UUID, DECIMAL, DECIMAL, UUID, TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION settle_x402_payment IS 'Batch settlement for x402 payments - updates both wallets and transfer status in single atomic transaction';

