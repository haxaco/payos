-- ============================================
-- Epic 27: Story 27.2 - Batch & Mass Payout API
-- ============================================
-- Enable partners to submit multiple transfers in a single request,
-- optimizing for payroll and procurement use cases.

-- Create transfer_batches table
CREATE TABLE IF NOT EXISTS transfer_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Batch metadata
  name TEXT,                         -- Optional batch name (e.g., "January Payroll")
  description TEXT,
  type TEXT DEFAULT 'payout',        -- 'payout', 'payroll', 'procurement', 'refund'
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, validating, processing, completed, failed, cancelled
  
  -- Item counts
  total_items INT NOT NULL DEFAULT 0,
  pending_items INT NOT NULL DEFAULT 0,
  processing_items INT NOT NULL DEFAULT 0,
  completed_items INT NOT NULL DEFAULT 0,
  failed_items INT NOT NULL DEFAULT 0,
  
  -- Amounts
  total_amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_fees DECIMAL(20, 8) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC',
  
  -- Processing info
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Source file (for CSV uploads)
  source_file_name TEXT,
  source_file_hash TEXT,
  
  -- Webhook notification
  webhook_url TEXT,
  webhook_delivered_at TIMESTAMPTZ,
  
  -- Idempotency
  idempotency_key TEXT,
  
  -- Audit
  created_by_type TEXT NOT NULL DEFAULT 'api_key',  -- user, api_key, agent
  created_by_id TEXT,
  created_by_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique idempotency key per tenant
  UNIQUE(tenant_id, idempotency_key)
);

-- Create transfer_batch_items table
CREATE TABLE IF NOT EXISTS transfer_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES transfer_batches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Ordering within batch
  sequence_number INT NOT NULL,
  
  -- Transfer details (from batch input)
  from_account_id UUID NOT NULL REFERENCES accounts(id),
  to_account_id UUID NOT NULL REFERENCES accounts(id),
  amount DECIMAL(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  destination_currency TEXT,
  description TEXT,
  reference TEXT,              -- External reference (e.g., invoice number)
  metadata JSONB DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed, skipped
  
  -- Created transfer (after successful processing)
  transfer_id UUID REFERENCES transfers(id),
  
  -- Validation
  validation_errors JSONB DEFAULT '[]',
  is_valid BOOLEAN DEFAULT TRUE,
  
  -- Processing result
  fee_amount DECIMAL(20, 8),
  net_amount DECIMAL(20, 8),
  settlement_rail TEXT,
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique sequence within batch
  UNIQUE(batch_id, sequence_number)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_transfer_batches_tenant 
ON transfer_batches(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfer_batches_status 
ON transfer_batches(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_transfer_batch_items_batch 
ON transfer_batch_items(batch_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_transfer_batch_items_status 
ON transfer_batch_items(batch_id, status);

CREATE INDEX IF NOT EXISTS idx_transfer_batch_items_transfer 
ON transfer_batch_items(transfer_id) 
WHERE transfer_id IS NOT NULL;

-- Enable RLS
ALTER TABLE transfer_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_batch_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for transfer_batches
CREATE POLICY transfer_batches_tenant_select ON transfer_batches
  FOR SELECT USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batches_tenant_insert ON transfer_batches
  FOR INSERT WITH CHECK (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batches_tenant_update ON transfer_batches
  FOR UPDATE USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batches_tenant_delete ON transfer_batches
  FOR DELETE USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batches_service_all ON transfer_batches
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for transfer_batch_items
CREATE POLICY transfer_batch_items_tenant_select ON transfer_batch_items
  FOR SELECT USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batch_items_tenant_insert ON transfer_batch_items
  FOR INSERT WITH CHECK (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batch_items_tenant_update ON transfer_batch_items
  FOR UPDATE USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batch_items_tenant_delete ON transfer_batch_items
  FOR DELETE USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY transfer_batch_items_service_all ON transfer_batch_items
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update batch statistics
CREATE OR REPLACE FUNCTION update_batch_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update batch item counts
  UPDATE transfer_batches
  SET 
    pending_items = (SELECT COUNT(*) FROM transfer_batch_items WHERE batch_id = NEW.batch_id AND status = 'pending'),
    processing_items = (SELECT COUNT(*) FROM transfer_batch_items WHERE batch_id = NEW.batch_id AND status = 'processing'),
    completed_items = (SELECT COUNT(*) FROM transfer_batch_items WHERE batch_id = NEW.batch_id AND status = 'completed'),
    failed_items = (SELECT COUNT(*) FROM transfer_batch_items WHERE batch_id = NEW.batch_id AND status = 'failed'),
    updated_at = NOW()
  WHERE id = NEW.batch_id;
  
  -- Check if batch is complete
  IF NOT EXISTS (
    SELECT 1 FROM transfer_batch_items 
    WHERE batch_id = NEW.batch_id 
    AND status IN ('pending', 'processing')
  ) THEN
    -- All items processed, update batch status
    UPDATE transfer_batches
    SET 
      status = CASE 
        WHEN (SELECT COUNT(*) FROM transfer_batch_items WHERE batch_id = NEW.batch_id AND status = 'failed') > 0 
        THEN 'completed_with_errors'
        ELSE 'completed'
      END,
      completed_at = NOW()
    WHERE id = NEW.batch_id
    AND status NOT IN ('completed', 'completed_with_errors', 'cancelled');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update batch stats on item changes
DROP TRIGGER IF EXISTS update_batch_stats_trigger ON transfer_batch_items;
CREATE TRIGGER update_batch_stats_trigger
  AFTER UPDATE OF status ON transfer_batch_items
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_stats();

-- Add comments for documentation
COMMENT ON TABLE transfer_batches IS 'Stores batch transfer requests for payroll and mass payouts';
COMMENT ON TABLE transfer_batch_items IS 'Individual transfers within a batch';
COMMENT ON COLUMN transfer_batches.status IS 'pending: awaiting processing, validating: checking items, processing: executing transfers, completed: all done, failed: batch failed';
COMMENT ON COLUMN transfer_batch_items.status IS 'pending: not started, processing: in flight, completed: transfer created, failed: error occurred, skipped: validation failed';

