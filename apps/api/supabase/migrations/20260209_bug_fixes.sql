-- Bug fixes: units mismatch + mandate-to-order linkage
-- Add order_ids JSONB column to ap2_mandate_executions (native array, not TEXT)
ALTER TABLE ap2_mandate_executions ADD COLUMN IF NOT EXISTS order_ids JSONB;
COMMENT ON COLUMN ap2_mandate_executions.order_ids IS 'JSON array of UCP order IDs funded by this execution';
