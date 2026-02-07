-- Fix the update_ap2_mandate_usage trigger function
-- The column was renamed from used_count to execution_count but the trigger was not updated
CREATE OR REPLACE FUNCTION update_ap2_mandate_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ap2_mandates
  SET
    used_amount = COALESCE(used_amount, 0) + NEW.amount,
    execution_count = COALESCE(execution_count, 0) + 1,
    updated_at = NOW()
  WHERE id = NEW.mandate_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
