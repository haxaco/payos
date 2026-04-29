-- Add 'disputed' to transfers status check constraint.
-- When a dispute is filed, the linked transfer is set to 'disputed' so
-- settlement workers and balance queries can hold/block further processing.

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_status_check;
ALTER TABLE transfers ADD CONSTRAINT transfers_status_check
  CHECK (status IN ('pending', 'processing', 'authorized', 'completed', 'failed', 'cancelled', 'disputed'));
