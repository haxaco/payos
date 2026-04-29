-- Cross-Tenant Transfers Support
-- Adds destination_tenant_id to transfers and payment_intents for cross-tenant audit trail.
-- Agents from different tenants can now pay each other.

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS destination_tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_transfers_dest_tenant
  ON transfers (destination_tenant_id) WHERE destination_tenant_id IS NOT NULL;

ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS destination_tenant_id UUID;

-- Update settle_x402_payment to support cross-tenant settlements
-- Adds p_provider_tenant_id parameter (defaults to p_tenant_id for backwards compat)
DROP FUNCTION IF EXISTS settle_x402_payment(UUID, UUID, DECIMAL, DECIMAL, UUID, UUID);
DROP FUNCTION IF EXISTS settle_x402_payment(UUID, UUID, DECIMAL, DECIMAL, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION settle_x402_payment(
  p_consumer_wallet_id UUID,
  p_provider_wallet_id UUID,
  p_gross_amount DECIMAL,
  p_net_amount DECIMAL,
  p_transfer_id UUID,
  p_tenant_id UUID,
  p_provider_tenant_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_consumer_new_balance DECIMAL;
  v_provider_new_balance DECIMAL;
  v_effective_provider_tenant UUID;
  v_result JSON;
BEGIN
  v_effective_provider_tenant := COALESCE(p_provider_tenant_id, p_tenant_id);

  -- Update consumer wallet (deduct gross amount)
  UPDATE wallets
  SET balance = balance - p_gross_amount,
      status = CASE WHEN (balance - p_gross_amount) <= 0 THEN 'depleted' ELSE status END,
      updated_at = NOW()
  WHERE id = p_consumer_wallet_id AND tenant_id = p_tenant_id
  RETURNING balance INTO v_consumer_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consumer wallet not found: %', p_consumer_wallet_id;
  END IF;

  -- Update provider wallet (credit net amount) — may be on a different tenant
  UPDATE wallets
  SET balance = balance + p_net_amount, updated_at = NOW()
  WHERE id = p_provider_wallet_id AND tenant_id = v_effective_provider_tenant
  RETURNING balance INTO v_provider_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider wallet not found: %', p_provider_wallet_id;
  END IF;

  -- Mark transfer as completed
  UPDATE transfers
  SET status = 'completed', settled_at = NOW()
  WHERE id = p_transfer_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found: %', p_transfer_id;
  END IF;

  v_result := json_build_object(
    'success', true,
    'consumerNewBalance', v_consumer_new_balance,
    'providerNewBalance', v_provider_new_balance,
    'settledAt', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION settle_x402_payment(UUID, UUID, DECIMAL, DECIMAL, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_x402_payment(UUID, UUID, DECIMAL, DECIMAL, UUID, UUID, UUID) TO service_role;
