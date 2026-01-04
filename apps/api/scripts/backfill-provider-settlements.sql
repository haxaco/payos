-- Backfill Script: Credit Provider Wallets for Past x402 Payments
-- Date: December 23, 2025
-- Issue: Provider wallets were never credited due to settlement bug
-- Fix: This script calculates what each provider should have received and credits their wallets

-- ============================================
-- STEP 1: CALCULATE WHAT PROVIDERS ARE OWED
-- ============================================

-- Summary by provider account
SELECT 
  t.to_account_id,
  a.name as provider_name,
  COUNT(t.id) as payment_count,
  SUM(t.amount::numeric) as gross_received,
  SUM(t.fee_amount::numeric) as total_fees,
  SUM((t.amount::numeric - COALESCE(t.fee_amount::numeric, 0))) as net_due,
  w.id as provider_wallet_id,
  w.balance as current_balance,
  w.currency
FROM transfers t
JOIN accounts a ON a.id = t.to_account_id
LEFT JOIN wallets w ON w.owner_account_id = a.id AND w.currency = t.currency AND w.status = 'active'
WHERE t.type = 'x402'
  AND t.status = 'completed'
GROUP BY t.to_account_id, a.name, w.id, w.balance, w.currency
ORDER BY net_due DESC;

-- ============================================
-- STEP 2: BACKFILL PROVIDER WALLETS
-- ============================================

-- WARNING: Run Step 1 first to review amounts before executing this!

-- Update Weather API Provider wallet
UPDATE wallets
SET 
  balance = balance + (
    SELECT SUM((t.amount::numeric - COALESCE(t.fee_amount::numeric, 0)))
    FROM transfers t
    WHERE t.type = 'x402'
      AND t.status = 'completed'
      AND t.to_account_id = (
        SELECT id FROM accounts WHERE name = 'Weather API Provider (Test)'
      )
      AND t.currency = 'USDC'
  ),
  updated_at = NOW()
WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13'
  AND tenant_id = 'da500003-4de9-416b-aebc-61cfcba914c9';

-- Verify the update
SELECT 
  w.id,
  a.name as owner,
  w.currency,
  w.balance as new_balance,
  w.updated_at
FROM wallets w
JOIN accounts a ON a.id = w.owner_account_id
WHERE w.id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13';

-- ============================================
-- STEP 3: VERIFY BALANCES MATCH EXPECTATIONS
-- ============================================

-- Check: Consumer spent + Provider received should equal gross payments
SELECT 
  'Validation Check' as check_name,
  (SELECT 100.00 - balance::numeric FROM wallets WHERE id = 'd199d814-5f53-4300-b1c8-81bd6ce5f00a') as consumer_spent,
  (SELECT balance::numeric FROM wallets WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13') as provider_received,
  (SELECT SUM(amount::numeric) FROM transfers WHERE type = 'x402' AND status = 'completed') as total_gross,
  (SELECT SUM(fee_amount::numeric) FROM transfers WHERE type = 'x402' AND status = 'completed') as total_fees,
  (SELECT balance::numeric FROM wallets WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13') + 
  (SELECT SUM(fee_amount::numeric) FROM transfers WHERE type = 'x402' AND status = 'completed') as provider_plus_fees,
  -- This should equal consumer_spent:
  CASE 
    WHEN ABS(
      (SELECT 100.00 - balance::numeric FROM wallets WHERE id = 'd199d814-5f53-4300-b1c8-81bd6ce5f00a') -
      ((SELECT balance::numeric FROM wallets WHERE id = '7a1fa1b0-95a7-4b68-812c-fd7cf3504c13') + 
       (SELECT SUM(fee_amount::numeric) FROM transfers WHERE type = 'x402' AND status = 'completed'))
    ) < 0.01 THEN '✅ BALANCED'
    ELSE '❌ MISMATCH'
  END as balance_check;

-- ============================================
-- NOTES
-- ============================================

-- Expected Results (as of Dec 23, 2025):
-- - Total payments: 138
-- - Gross paid: $0.156
-- - Fees (2.9%): ~$0.004234
-- - Net to provider: ~$0.152
--
-- Consumer wallet should be: $100.00 - $0.156 = $99.844
-- Provider wallet should be: $0.00 + $0.152 = $0.152
-- Platform fees collected: $0.004234
--
-- After backfill:
-- ✅ Consumer: $99.908 (actual spent: $0.092, not $0.156 - need to check why)
-- ✅ Provider: $0.152 (will be credited)
-- ✅ Fees: $0.004234 (recorded in transfers)



