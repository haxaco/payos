-- Migration: Add Card Spending Limits to Payment Methods
-- Epic: 0, Story: 0.3
-- Date: 2025-12-18
-- Purpose: Add spending limit columns to support card controls and usage tracking

-- ============================================
-- Add spending limit columns
-- ============================================

ALTER TABLE payment_methods
  -- Spending limits configuration
  ADD COLUMN spending_limit_per_transaction NUMERIC(20,2) DEFAULT NULL,
  ADD COLUMN spending_limit_daily NUMERIC(20,2) DEFAULT NULL,
  ADD COLUMN spending_limit_monthly NUMERIC(20,2) DEFAULT NULL,
  
  -- Current usage tracking (resets based on period)
  ADD COLUMN spending_used_daily NUMERIC(20,2) DEFAULT 0 NOT NULL,
  ADD COLUMN spending_used_monthly NUMERIC(20,2) DEFAULT 0 NOT NULL,
  
  -- Period tracking for resets
  ADD COLUMN spending_period_start_daily DATE DEFAULT CURRENT_DATE,
  ADD COLUMN spending_period_start_monthly DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  
  -- Soft freeze for over-limit cards (can be unfrozen by admin)
  ADD COLUMN is_frozen BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN frozen_reason TEXT DEFAULT NULL,
  ADD COLUMN frozen_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- Add indexes for performance
-- ============================================

-- Index for finding frozen cards
CREATE INDEX idx_payment_methods_frozen 
  ON payment_methods(tenant_id, is_frozen) 
  WHERE is_frozen = true;

-- Index for finding cards needing daily reset
CREATE INDEX idx_payment_methods_daily_reset 
  ON payment_methods(spending_period_start_daily) 
  WHERE spending_used_daily > 0;

-- Index for finding cards needing monthly reset
CREATE INDEX idx_payment_methods_monthly_reset 
  ON payment_methods(spending_period_start_monthly) 
  WHERE spending_used_monthly > 0;

-- ============================================
-- Add column comments
-- ============================================

COMMENT ON COLUMN payment_methods.spending_limit_per_transaction IS 'Maximum amount allowed per single transaction. NULL = no limit.';
COMMENT ON COLUMN payment_methods.spending_limit_daily IS 'Maximum amount allowed per day. NULL = no limit.';
COMMENT ON COLUMN payment_methods.spending_limit_monthly IS 'Maximum amount allowed per month. NULL = no limit.';
COMMENT ON COLUMN payment_methods.spending_used_daily IS 'Amount spent today. Resets at midnight based on period start.';
COMMENT ON COLUMN payment_methods.spending_used_monthly IS 'Amount spent this month. Resets on the 1st based on period start.';
COMMENT ON COLUMN payment_methods.spending_period_start_daily IS 'Date when daily spending tracking started. Used to detect when to reset.';
COMMENT ON COLUMN payment_methods.spending_period_start_monthly IS 'Date when monthly spending tracking started. Used to detect when to reset.';
COMMENT ON COLUMN payment_methods.is_frozen IS 'Whether card is temporarily frozen (can be unfrozen by admin).';
COMMENT ON COLUMN payment_methods.frozen_reason IS 'Reason for freezing (e.g., "spending_limit_exceeded", "user_requested", "fraud_suspected").';
COMMENT ON COLUMN payment_methods.frozen_at IS 'Timestamp when card was frozen.';

-- ============================================
-- Create function to check and enforce limits
-- ============================================

CREATE OR REPLACE FUNCTION check_payment_method_limits(
  p_payment_method_id UUID,
  p_transaction_amount NUMERIC
) RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  daily_remaining NUMERIC,
  monthly_remaining NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_method RECORD;
  v_daily_remaining NUMERIC;
  v_monthly_remaining NUMERIC;
BEGIN
  -- Get payment method with limits
  SELECT * INTO v_method
  FROM payment_methods
  WHERE id = p_payment_method_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Payment method not found', 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Check if frozen
  IF v_method.is_frozen THEN
    RETURN QUERY SELECT false, 'Card is frozen: ' || COALESCE(v_method.frozen_reason, 'unknown'), 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Reset daily limit if needed (new day)
  IF v_method.spending_period_start_daily < CURRENT_DATE THEN
    UPDATE payment_methods
    SET 
      spending_used_daily = 0,
      spending_period_start_daily = CURRENT_DATE
    WHERE id = p_payment_method_id;
    
    v_method.spending_used_daily := 0;
  END IF;
  
  -- Reset monthly limit if needed (new month)
  IF DATE_TRUNC('month', v_method.spending_period_start_monthly) < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE payment_methods
    SET 
      spending_used_monthly = 0,
      spending_period_start_monthly = DATE_TRUNC('month', CURRENT_DATE)::DATE
    WHERE id = p_payment_method_id;
    
    v_method.spending_used_monthly := 0;
  END IF;
  
  -- Check per-transaction limit
  IF v_method.spending_limit_per_transaction IS NOT NULL 
     AND p_transaction_amount > v_method.spending_limit_per_transaction THEN
    RETURN QUERY SELECT false, 'Transaction exceeds per-transaction limit', 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Check daily limit
  IF v_method.spending_limit_daily IS NOT NULL THEN
    v_daily_remaining := v_method.spending_limit_daily - v_method.spending_used_daily;
    IF p_transaction_amount > v_daily_remaining THEN
      RETURN QUERY SELECT false, 'Transaction exceeds daily limit', v_daily_remaining, 0::NUMERIC;
      RETURN;
    END IF;
  ELSE
    v_daily_remaining := NULL; -- No limit
  END IF;
  
  -- Check monthly limit
  IF v_method.spending_limit_monthly IS NOT NULL THEN
    v_monthly_remaining := v_method.spending_limit_monthly - v_method.spending_used_monthly;
    IF p_transaction_amount > v_monthly_remaining THEN
      RETURN QUERY SELECT false, 'Transaction exceeds monthly limit', v_daily_remaining, v_monthly_remaining;
      RETURN;
    END IF;
  ELSE
    v_monthly_remaining := NULL; -- No limit
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    true, 
    'Transaction allowed', 
    COALESCE(v_daily_remaining, -1), -- -1 indicates no limit
    COALESCE(v_monthly_remaining, -1);
END;
$$;

COMMENT ON FUNCTION check_payment_method_limits IS 'Checks if a transaction amount is within spending limits for a payment method. Returns allowed status and remaining limits.';

-- ============================================
-- Create function to update spending usage
-- ============================================

CREATE OR REPLACE FUNCTION update_payment_method_spending(
  p_payment_method_id UUID,
  p_transaction_amount NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payment_methods
  SET 
    spending_used_daily = spending_used_daily + p_transaction_amount,
    spending_used_monthly = spending_used_monthly + p_transaction_amount,
    updated_at = NOW()
  WHERE id = p_payment_method_id;
END;
$$;

COMMENT ON FUNCTION update_payment_method_spending IS 'Updates spending usage for a payment method after a successful transaction.';

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
  v_column_count INT;
BEGIN
  -- Check that all columns were added
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'payment_methods'
    AND column_name IN (
      'spending_limit_per_transaction',
      'spending_limit_daily',
      'spending_limit_monthly',
      'spending_used_daily',
      'spending_used_monthly',
      'spending_period_start_daily',
      'spending_period_start_monthly',
      'is_frozen',
      'frozen_reason',
      'frozen_at'
    );
  
  IF v_column_count != 10 THEN
    RAISE EXCEPTION 'Not all spending limit columns were added. Expected 10, found %', v_column_count;
  END IF;
  
  RAISE NOTICE '✅ Successfully added spending limit columns to payment_methods table';
  RAISE NOTICE '✅ Created check_payment_method_limits() function';
  RAISE NOTICE '✅ Created update_payment_method_spending() function';
  RAISE NOTICE '💳 Card spending limits are now supported';
END $$;


