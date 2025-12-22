-- ============================================
-- x402 Test Data Generation
-- ============================================
-- Creates sample providers, consumers, wallets, endpoints, and transactions
-- for testing the x402 payment gateway functionality.

-- Get the haxaco tenant ID (assuming it exists from previous setup)
DO $$
DECLARE
  v_tenant_id uuid;
  v_provider_account_id uuid;
  v_provider_wallet_id uuid;
  v_consumer_account_id_1 uuid;
  v_consumer_wallet_id_1 uuid;
  v_consumer_account_id_2 uuid;
  v_consumer_wallet_id_2 uuid;
  v_endpoint_id_1 uuid;
  v_endpoint_id_2 uuid;
  v_endpoint_id_3 uuid;
BEGIN
  -- Get tenant ID (haxaco tenant)
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'haxaco' LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found. Run initial setup first.';
  END IF;

  RAISE NOTICE 'Using tenant: %', v_tenant_id;

  -- ============================================
  -- 1. CREATE PROVIDER ACCOUNT & WALLET
  -- ============================================
  
  -- Create API Provider Account
  INSERT INTO accounts (
    id, tenant_id, account_name, account_type, currency, balance, 
    kyc_status, status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, 'WeatherAPI Provider', 'business', 'USDC', 0,
    'approved', 'active', now(), now()
  ) RETURNING id INTO v_provider_account_id;
  
  RAISE NOTICE 'Created provider account: %', v_provider_account_id;
  
  -- Create Provider Wallet
  INSERT INTO wallets (
    id, tenant_id, owner_account_id, currency, balance, status, 
    wallet_address, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_provider_account_id, 'USDC', 0, 'active',
    '0x' || encode(gen_random_bytes(20), 'hex'), now(), now()
  ) RETURNING id INTO v_provider_wallet_id;
  
  RAISE NOTICE 'Created provider wallet: %', v_provider_wallet_id;
  
  -- ============================================
  -- 2. CREATE CONSUMER ACCOUNTS & WALLETS
  -- ============================================
  
  -- Consumer 1: AI Startup
  INSERT INTO accounts (
    id, tenant_id, account_name, account_type, currency, balance, 
    kyc_status, status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, 'AI Startup Inc', 'business', 'USDC', 0,
    'approved', 'active', now(), now()
  ) RETURNING id INTO v_consumer_account_id_1;
  
  INSERT INTO wallets (
    id, tenant_id, owner_account_id, currency, balance, status, 
    wallet_address, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_consumer_account_id_1, 'USDC', 100.00, 'active',
    '0x' || encode(gen_random_bytes(20), 'hex'), now(), now()
  ) RETURNING id INTO v_consumer_wallet_id_1;
  
  RAISE NOTICE 'Created consumer 1: account=% wallet=%', v_consumer_account_id_1, v_consumer_wallet_id_1;
  
  -- Consumer 2: Mobile App
  INSERT INTO accounts (
    id, tenant_id, account_name, account_type, currency, balance, 
    kyc_status, status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, 'WeatherNow Mobile', 'business', 'USDC', 0,
    'approved', 'active', now(), now()
  ) RETURNING id INTO v_consumer_account_id_2;
  
  INSERT INTO wallets (
    id, tenant_id, owner_account_id, currency, balance, status, 
    wallet_address, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_consumer_account_id_2, 'USDC', 250.00, 'active',
    '0x' || encode(gen_random_bytes(20), 'hex'), now(), now()
  ) RETURNING id INTO v_consumer_wallet_id_2;
  
  RAISE NOTICE 'Created consumer 2: account=% wallet=%', v_consumer_account_id_2, v_consumer_wallet_id_2;
  
  -- ============================================
  -- 3. CREATE x402 ENDPOINTS
  -- ============================================
  
  -- Endpoint 1: Premium Weather Data
  INSERT INTO x402_endpoints (
    id, tenant_id, account_id, name, path, method, description,
    base_price, currency, payment_address, network, status,
    total_calls, total_revenue, volume_discounts, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_provider_account_id,
    'Weather API Premium', '/api/weather-premium', 'GET',
    'Real-time premium weather data with 15-minute forecasts',
    0.01, 'USDC', 
    'internal://payos/' || v_tenant_id || '/' || v_provider_account_id,
    'base-mainnet', 'active', 0, 0,
    '[{"threshold": 1000, "priceMultiplier": 0.8}, {"threshold": 10000, "priceMultiplier": 0.6}]'::jsonb,
    now(), now()
  ) RETURNING id INTO v_endpoint_id_1;
  
  RAISE NOTICE 'Created endpoint 1: %', v_endpoint_id_1;
  
  -- Endpoint 2: Historical Weather Data
  INSERT INTO x402_endpoints (
    id, tenant_id, account_id, name, path, method, description,
    base_price, currency, payment_address, network, status,
    total_calls, total_revenue, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_provider_account_id,
    'Historical Weather API', '/api/weather-history', 'GET',
    'Access to 10 years of historical weather data',
    0.005, 'USDC',
    'internal://payos/' || v_tenant_id || '/' || v_provider_account_id,
    'base-mainnet', 'active', 0, 0, now(), now()
  ) RETURNING id INTO v_endpoint_id_2;
  
  RAISE NOTICE 'Created endpoint 2: %', v_endpoint_id_2;
  
  -- Endpoint 3: Weather Alerts (inactive for testing)
  INSERT INTO x402_endpoints (
    id, tenant_id, account_id, name, path, method, description,
    base_price, currency, payment_address, network, status,
    total_calls, total_revenue, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_provider_account_id,
    'Weather Alerts API', '/api/weather-alerts', 'POST',
    'Subscribe to real-time severe weather alerts',
    0.02, 'USDC',
    'internal://payos/' || v_tenant_id || '/' || v_provider_account_id,
    'base-mainnet', 'paused', 0, 0, now(), now()
  ) RETURNING id INTO v_endpoint_id_3;
  
  RAISE NOTICE 'Created endpoint 3: %', v_endpoint_id_3;
  
  -- ============================================
  -- 4. CREATE x402 TRANSACTIONS (WALLET-TO-WALLET)
  -- ============================================
  
  -- Transaction 1: AI Startup calls Premium API (30 days ago)
  INSERT INTO transfers (
    id, tenant_id, type, status, from_account_id, to_account_id,
    amount, currency, description,
    initiated_by_type, initiated_by_id, initiated_by_name,
    x402_metadata, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, 'x402', 'completed',
    v_consumer_account_id_1, v_provider_account_id,
    0.01, 'USDC', 'x402 payment: Weather API Premium',
    'system', v_consumer_wallet_id_1, 'AI Startup Inc',
    jsonb_build_object(
      'endpoint_id', v_endpoint_id_1,
      'endpoint_path', '/api/weather-premium',
      'endpoint_method', 'GET',
      'wallet_id', v_consumer_wallet_id_1,
      'request_id', 'req_' || encode(gen_random_bytes(16), 'hex'),
      'timestamp', extract(epoch from (now() - interval '30 days'))::text,
      'price_calculated', 0.01,
      'settlement_fee', 0.0003,
      'settlement_net_amount', 0.0097
    ),
    now() - interval '30 days', now() - interval '30 days'
  );
  
  -- Transaction 2: Mobile App calls Premium API (25 days ago)
  INSERT INTO transfers (
    id, tenant_id, type, status, from_account_id, to_account_id,
    amount, currency, description,
    initiated_by_type, initiated_by_id, initiated_by_name,
    x402_metadata, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, 'x402', 'completed',
    v_consumer_account_id_2, v_provider_account_id,
    0.01, 'USDC', 'x402 payment: Weather API Premium',
    'system', v_consumer_wallet_id_2, 'WeatherNow Mobile',
    jsonb_build_object(
      'endpoint_id', v_endpoint_id_1,
      'endpoint_path', '/api/weather-premium',
      'endpoint_method', 'GET',
      'wallet_id', v_consumer_wallet_id_2,
      'request_id', 'req_' || encode(gen_random_bytes(16), 'hex'),
      'timestamp', extract(epoch from (now() - interval '25 days'))::text,
      'price_calculated', 0.01,
      'settlement_fee', 0.0003,
      'settlement_net_amount', 0.0097
    ),
    now() - interval '25 days', now() - interval '25 days'
  );
  
  -- Transaction 3: AI Startup calls Historical API (20 days ago)
  INSERT INTO transfers (
    id, tenant_id, type, status, from_account_id, to_account_id,
    amount, currency, description,
    initiated_by_type, initiated_by_id, initiated_by_name,
    x402_metadata, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, 'x402', 'completed',
    v_consumer_account_id_1, v_provider_account_id,
    0.005, 'USDC', 'x402 payment: Historical Weather API',
    'system', v_consumer_wallet_id_1, 'AI Startup Inc',
    jsonb_build_object(
      'endpoint_id', v_endpoint_id_2,
      'endpoint_path', '/api/weather-history',
      'endpoint_method', 'GET',
      'wallet_id', v_consumer_wallet_id_1,
      'request_id', 'req_' || encode(gen_random_bytes(16), 'hex'),
      'timestamp', extract(epoch from (now() - interval '20 days'))::text,
      'price_calculated', 0.005,
      'settlement_fee', 0.00015,
      'settlement_net_amount', 0.00485
    ),
    now() - interval '20 days', now() - interval '20 days'
  );
  
  -- Transaction 4-10: Recent transactions over the past 2 weeks
  FOR i IN 1..7 LOOP
    INSERT INTO transfers (
      id, tenant_id, type, status, from_account_id, to_account_id,
      amount, currency, description,
      initiated_by_type, initiated_by_id, initiated_by_name,
      x402_metadata, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_tenant_id, 'x402', 'completed',
      CASE WHEN i % 2 = 0 THEN v_consumer_account_id_1 ELSE v_consumer_account_id_2 END,
      v_provider_account_id,
      CASE WHEN i % 3 = 0 THEN 0.005 ELSE 0.01 END,
      'USDC',
      CASE WHEN i % 3 = 0 THEN 'x402 payment: Historical Weather API' ELSE 'x402 payment: Weather API Premium' END,
      'system',
      CASE WHEN i % 2 = 0 THEN v_consumer_wallet_id_1 ELSE v_consumer_wallet_id_2 END,
      CASE WHEN i % 2 = 0 THEN 'AI Startup Inc' ELSE 'WeatherNow Mobile' END,
      jsonb_build_object(
        'endpoint_id', CASE WHEN i % 3 = 0 THEN v_endpoint_id_2 ELSE v_endpoint_id_1 END,
        'endpoint_path', CASE WHEN i % 3 = 0 THEN '/api/weather-history' ELSE '/api/weather-premium' END,
        'endpoint_method', 'GET',
        'wallet_id', CASE WHEN i % 2 = 0 THEN v_consumer_wallet_id_1 ELSE v_consumer_wallet_id_2 END,
        'request_id', 'req_' || encode(gen_random_bytes(16), 'hex'),
        'timestamp', extract(epoch from (now() - (i || ' days')::interval))::text,
        'price_calculated', CASE WHEN i % 3 = 0 THEN 0.005 ELSE 0.01 END,
        'settlement_fee', CASE WHEN i % 3 = 0 THEN 0.00015 ELSE 0.0003 END,
        'settlement_net_amount', CASE WHEN i % 3 = 0 THEN 0.00485 ELSE 0.0097 END
      ),
      now() - (i || ' days')::interval, now() - (i || ' days')::interval
    );
  END LOOP;
  
  -- ============================================
  -- 5. UPDATE ENDPOINT STATS
  -- ============================================
  
  -- Update endpoint 1 stats (Premium API - 8 calls)
  UPDATE x402_endpoints
  SET 
    total_calls = 8,
    total_revenue = 0.08,
    updated_at = now()
  WHERE id = v_endpoint_id_1;
  
  -- Update endpoint 2 stats (Historical API - 3 calls)
  UPDATE x402_endpoints
  SET 
    total_calls = 3,
    total_revenue = 0.015,
    updated_at = now()
  WHERE id = v_endpoint_id_2;
  
  -- ============================================
  -- 6. UPDATE ACCOUNT BALANCES
  -- ============================================
  
  -- Update provider account balance (received payments minus fees)
  UPDATE accounts
  SET 
    balance = 0.08 + 0.015 - (0.0003 * 8) - (0.00015 * 3), -- Total revenue minus fees
    updated_at = now()
  WHERE id = v_provider_account_id;
  
  -- Update consumer 1 balance (spent money)
  UPDATE accounts
  SET 
    balance = -0.055, -- 5 transactions * 0.01 + 1 * 0.005
    updated_at = now()
  WHERE id = v_consumer_account_id_1;
  
  -- Update consumer 2 balance (spent money)
  UPDATE accounts
  SET 
    balance = -0.04, -- 4 transactions * 0.01
    updated_at = now()
  WHERE id = v_consumer_account_id_2;
  
  -- Update wallet balances to match
  UPDATE wallets SET balance = 100.00 - 0.055 WHERE id = v_consumer_wallet_id_1;
  UPDATE wallets SET balance = 250.00 - 0.04 WHERE id = v_consumer_wallet_id_2;
  UPDATE wallets SET balance = 0.08 + 0.015 - (0.0003 * 8) - (0.00015 * 3) WHERE id = v_provider_wallet_id;
  
  RAISE NOTICE '✅ x402 test data created successfully!';
  RAISE NOTICE '   - Provider Account: %', v_provider_account_id;
  RAISE NOTICE '   - Provider Wallet: %', v_provider_wallet_id;
  RAISE NOTICE '   - Consumer Accounts: %, %', v_consumer_account_id_1, v_consumer_account_id_2;
  RAISE NOTICE '   - Endpoints: %, %, %', v_endpoint_id_1, v_endpoint_id_2, v_endpoint_id_3;
  RAISE NOTICE '   - Transactions: 10 created';
  
END $$;

-- ============================================
-- 7. VERIFY DATA
-- ============================================

-- Show summary
SELECT 
  'x402 Endpoints' as entity,
  COUNT(*)::text as count
FROM x402_endpoints
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'haxaco' LIMIT 1)
UNION ALL
SELECT 
  'x402 Transactions',
  COUNT(*)::text
FROM transfers
WHERE type = 'x402' AND tenant_id = (SELECT id FROM tenants WHERE slug = 'haxaco' LIMIT 1)
UNION ALL
SELECT 
  'Provider Wallets',
  COUNT(*)::text
FROM wallets w
JOIN accounts a ON w.owner_account_id = a.id
WHERE a.account_name LIKE '%Provider%' AND a.tenant_id = (SELECT id FROM tenants WHERE slug = 'haxaco' LIMIT 1)
UNION ALL
SELECT 
  'Consumer Wallets',
  COUNT(*)::text
FROM wallets w
JOIN accounts a ON w.owner_account_id = a.id
WHERE (a.account_name LIKE '%Startup%' OR a.account_name LIKE '%Mobile%') 
  AND a.tenant_id = (SELECT id FROM tenants WHERE slug = 'haxaco' LIMIT 1);

