-- Atomic increment for agent attribution counters
-- Called from completeCheckout when agent_id is present in checkout metadata

CREATE OR REPLACE FUNCTION increment_agent_counters(
  p_agent_id UUID,
  p_volume NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agents
  SET
    total_volume = COALESCE(total_volume, 0) + COALESCE(p_volume, 0),
    total_transactions = COALESCE(total_transactions, 0) + 1,
    updated_at = NOW()
  WHERE id = p_agent_id;
END;
$$;
