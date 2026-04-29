-- Epic 81 — rename total_usdc_wasted and split it honestly.
--
-- The original column summed `amount` across every cancelled x402
-- row, which conflated two very different things:
--   * signed authorization the vendor never redeemed (NO money moved —
--     the authorization sat unredeemed until `validBefore` expired).
--     Tina's $20 "wasted" on Venice is two $10 prepay asks in this
--     bucket; the funds never left her wallet.
--   * actually settled on-chain but got nothing useful back — true
--     paid-and-lost. `tx_hash` is set in this case. Rare.
--
-- Renaming to `total_usdc_authorized_unredeemed` and adding
-- `total_usdc_paid_unreturned` so the dashboard can label each
-- accurately. Back-compat: callers reading `total_usdc_wasted` from
-- the old shape now compute it as the sum of both.

DROP FUNCTION IF EXISTS x402_vendor_reliability(uuid, timestamptz, text);

CREATE OR REPLACE FUNCTION x402_vendor_reliability(
  p_tenant_id uuid,
  p_since timestamptz DEFAULT (now() - interval '30 days'),
  p_environment text DEFAULT NULL
) RETURNS TABLE (
  host                             text,
  marketplace                      text,
  settlement_network               text,
  total_calls                      bigint,
  completed_count                  bigint,
  cancelled_count                  bigint,
  pending_count                    bigint,
  success_rate                     numeric,
  avg_response_size                numeric,
  avg_duration_ms                  numeric,
  classification_histogram         jsonb,
  last_success_at                  timestamptz,
  last_failure_at                  timestamptz,
  first_seen_at                    timestamptz,
  total_usdc_spent                 numeric,
  total_usdc_authorized_unredeemed numeric,
  total_usdc_paid_unreturned       numeric
) LANGUAGE sql STABLE AS $$
  WITH scoped AS (
    SELECT
      protocol_metadata->'resource'->>'host'          AS host,
      protocol_metadata->'resource'->>'marketplace'   AS marketplace,
      settlement_network,
      status,
      tx_hash,
      amount::numeric                                  AS amount_usdc,
      (protocol_metadata->'response'->>'durationMs')::numeric AS duration_ms,
      (protocol_metadata->'response'->>'sizeBytes')::numeric  AS size_bytes,
      COALESCE(protocol_metadata->'classification'->>'code', 'UNCLASSIFIED') AS classification_code,
      created_at
    FROM transfers
    WHERE tenant_id = p_tenant_id
      AND type = 'x402'
      AND protocol_metadata->>'direction' = 'external'
      AND protocol_metadata->'resource'->>'host' IS NOT NULL
      AND created_at >= p_since
      AND (p_environment IS NULL OR environment = p_environment)
  ),
  histograms AS (
    SELECT host, jsonb_object_agg(classification_code, cnt) AS classification_histogram
    FROM (
      SELECT host, classification_code, COUNT(*) AS cnt
      FROM scoped WHERE status <> 'completed'
      GROUP BY host, classification_code
    ) h
    GROUP BY host
  )
  SELECT
    s.host,
    max(s.marketplace)                                                            AS marketplace,
    mode() WITHIN GROUP (ORDER BY s.settlement_network)                           AS settlement_network,
    count(*)                                                                       AS total_calls,
    count(*) FILTER (WHERE s.status = 'completed')                                 AS completed_count,
    count(*) FILTER (WHERE s.status = 'cancelled')                                 AS cancelled_count,
    count(*) FILTER (WHERE s.status IN ('pending', 'processing'))                  AS pending_count,
    CASE WHEN count(*) > 0
      THEN round((count(*) FILTER (WHERE s.status = 'completed'))::numeric / count(*), 4)
      ELSE 0
    END                                                                           AS success_rate,
    round(avg(s.size_bytes) FILTER (WHERE s.size_bytes IS NOT NULL), 0)           AS avg_response_size,
    round(avg(s.duration_ms) FILTER (WHERE s.duration_ms IS NOT NULL), 0)         AS avg_duration_ms,
    COALESCE(h.classification_histogram, '{}'::jsonb)                             AS classification_histogram,
    max(s.created_at) FILTER (WHERE s.status = 'completed')                       AS last_success_at,
    max(s.created_at) FILTER (WHERE s.status = 'cancelled')                       AS last_failure_at,
    min(s.created_at)                                                             AS first_seen_at,
    COALESCE(sum(s.amount_usdc) FILTER (WHERE s.status = 'completed'), 0)         AS total_usdc_spent,
    COALESCE(sum(s.amount_usdc) FILTER (WHERE s.status = 'cancelled' AND s.tx_hash IS NULL), 0)      AS total_usdc_authorized_unredeemed,
    COALESCE(sum(s.amount_usdc) FILTER (WHERE s.status = 'cancelled' AND s.tx_hash IS NOT NULL), 0)  AS total_usdc_paid_unreturned
  FROM scoped s
  LEFT JOIN histograms h USING (host)
  GROUP BY s.host, h.classification_histogram
  ORDER BY total_calls DESC;
$$;

GRANT EXECUTE ON FUNCTION x402_vendor_reliability(uuid, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION x402_vendor_reliability(uuid, timestamptz, text) TO authenticated;
