import type { SupabaseClient } from '@supabase/supabase-js';
import type { MerchantScan, ScanProtocolResult, ScanBatch, DetectionStatus } from '@sly/types';
import { getClient } from './client.js';

function isDetected(status?: string): boolean {
  return status === 'confirmed' || status === 'platform_enabled' || status === 'eligible';
}

function db(): SupabaseClient {
  return getClient();
}

// ============================================
// MERCHANT SCANS
// ============================================

export async function upsertMerchantScan(
  tenantId: string,
  data: {
    domain: string;
    url: string;
    merchant_name?: string;
    merchant_category?: string;
    country_code?: string;
    region?: string;
    scan_status: string;
  },
): Promise<MerchantScan> {
  const { data: scan, error } = await db()
    .from('merchant_scans')
    .upsert(
      { tenant_id: tenantId, ...data, scan_version: '1.0' },
      { onConflict: 'tenant_id,domain' },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert merchant scan: ${error.message}`);
  return scan;
}

export async function updateMerchantScan(
  id: string,
  data: Partial<{
    scan_status: string;
    readiness_score: number;
    protocol_score: number;
    data_score: number;
    accessibility_score: number;
    checkout_score: number;
    business_model: string;
    last_scanned_at: string;
    scan_duration_ms: number;
    error_message: string | null;
  }>,
): Promise<void> {
  const { error } = await db()
    .from('merchant_scans')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(`Failed to update merchant scan: ${error.message}`);
}

export async function getMerchantScanByDomain(
  tenantId: string,
  domain: string,
): Promise<MerchantScan | null> {
  const { data, error } = await db()
    .from('merchant_scans')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', domain)
    .maybeSingle();

  if (error) throw new Error(`Failed to get merchant scan: ${error.message}`);
  return data;
}

export async function getMerchantScanById(id: string): Promise<MerchantScan | null> {
  const { data, error } = await db()
    .from('merchant_scans')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to get merchant scan: ${error.message}`);
  return data;
}

export async function getMerchantScanWithDetails(id: string): Promise<MerchantScan | null> {
  const scan = await getMerchantScanById(id);
  if (!scan) return null;

  const [protocols, structured, accessibility] = await Promise.all([
    getProtocolResults(id),
    getStructuredData(id),
    getAccessibility(id),
  ]);

  return {
    ...scan,
    protocol_results: protocols,
    structured_data: structured || undefined,
    accessibility: accessibility || undefined,
  };
}

export async function listMerchantScans(
  tenantId: string,
  filters: {
    category?: string;
    region?: string;
    status?: string;
    min_score?: number;
    max_score?: number;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ data: MerchantScan[]; total: number }> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = db()
    .from('merchant_scans')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.category) query = query.eq('merchant_category', filters.category);
  if (filters.region) query = query.eq('region', filters.region);
  if (filters.status) query = query.eq('scan_status', filters.status);
  if (filters.min_score !== undefined) query = query.gte('readiness_score', filters.min_score);
  if (filters.max_score !== undefined) query = query.lte('readiness_score', filters.max_score);

  query = query.order('readiness_score', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list merchant scans: ${error.message}`);
  return { data: data || [], total: count || 0 };
}

export async function getScanStats(tenantId: string): Promise<{
  total: number;
  completed: number;
  avg_readiness_score: number;
  by_category: Record<string, number>;
  by_region: Record<string, number>;
}> {
  const { data, error } = await db()
    .from('merchant_scans')
    .select('scan_status, readiness_score, merchant_category, region')
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`Failed to get scan stats: ${error.message}`);

  const scans = data || [];
  const completed = scans.filter(s => s.scan_status === 'completed');
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, s) => sum + s.readiness_score, 0) / completed.length)
    : 0;

  const byCategory: Record<string, number> = {};
  const byRegion: Record<string, number> = {};

  for (const scan of completed) {
    if (scan.merchant_category) {
      byCategory[scan.merchant_category] = (byCategory[scan.merchant_category] || 0) + 1;
    }
    if (scan.region) {
      byRegion[scan.region] = (byRegion[scan.region] || 0) + 1;
    }
  }

  return {
    total: scans.length,
    completed: completed.length,
    avg_readiness_score: avgScore,
    by_category: byCategory,
    by_region: byRegion,
  };
}

// ============================================
// PROTOCOL RESULTS
// ============================================

export async function insertProtocolResults(
  merchantScanId: string,
  results: Array<{
    protocol: string;
    status?: string;
    confidence?: string;
    eligibility_signals?: string[];
    detection_method?: string;
    endpoint_url?: string;
    capabilities: Record<string, unknown>;
    response_time_ms?: number;
    is_functional?: boolean;
  }>,
): Promise<void> {
  // Delete existing results for this scan
  await db()
    .from('scan_protocol_results')
    .delete()
    .eq('merchant_scan_id', merchantScanId);

  if (results.length === 0) return;

  const rows = results.map(r => ({
    merchant_scan_id: merchantScanId,
    protocol: r.protocol,
    detected: isDetected(r.status),
    status: r.status || 'not_detected',
    confidence: r.confidence || 'medium',
    eligibility_signals: r.eligibility_signals || [],
    detection_method: r.detection_method,
    endpoint_url: r.endpoint_url,
    capabilities: r.capabilities,
    response_time_ms: r.response_time_ms,
    is_functional: r.is_functional,
    last_verified_at: new Date().toISOString(),
  }));

  const { error } = await db().from('scan_protocol_results').insert(rows);
  if (error) throw new Error(`Failed to insert protocol results: ${error.message}`);
}

export async function getProtocolResults(merchantScanId: string): Promise<ScanProtocolResult[]> {
  const { data, error } = await db()
    .from('scan_protocol_results')
    .select('*')
    .eq('merchant_scan_id', merchantScanId);

  if (error) throw new Error(`Failed to get protocol results: ${error.message}`);
  return data || [];
}

// ============================================
// STRUCTURED DATA
// ============================================

export async function upsertStructuredData(
  merchantScanId: string,
  data: {
    has_schema_product: boolean;
    has_schema_offer: boolean;
    has_schema_organization: boolean;
    has_json_ld: boolean;
    has_open_graph: boolean;
    has_microdata: boolean;
    product_count: number;
    products_with_price: number;
    products_with_availability: number;
    products_with_sku: number;
    products_with_image: number;
    data_quality_score: number;
    sample_products: unknown[];
  },
): Promise<void> {
  // Delete existing
  await db()
    .from('scan_structured_data')
    .delete()
    .eq('merchant_scan_id', merchantScanId);

  const { error } = await db()
    .from('scan_structured_data')
    .insert({ merchant_scan_id: merchantScanId, ...data });

  if (error) throw new Error(`Failed to upsert structured data: ${error.message}`);
}

export async function getStructuredData(merchantScanId: string) {
  const { data, error } = await db()
    .from('scan_structured_data')
    .select('*')
    .eq('merchant_scan_id', merchantScanId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get structured data: ${error.message}`);
  return data;
}

// ============================================
// ACCESSIBILITY
// ============================================

export async function upsertAccessibility(
  merchantScanId: string,
  data: {
    robots_txt_exists: boolean;
    robots_blocks_gptbot: boolean;
    robots_blocks_claudebot: boolean;
    robots_blocks_googlebot: boolean;
    robots_blocks_all_bots: boolean;
    robots_allows_agents: boolean;
    robots_raw?: string;
    requires_javascript: boolean;
    has_captcha: boolean;
    requires_account: boolean;
    guest_checkout_available: boolean;
    checkout_steps_count?: number;
    payment_processors: string[];
    supports_digital_wallets: boolean;
    supports_crypto: boolean;
    supports_pix: boolean;
    supports_spei: boolean;
    ecommerce_platform?: string;
    platform_version?: string;
  },
): Promise<void> {
  // Delete existing
  await db()
    .from('scan_accessibility')
    .delete()
    .eq('merchant_scan_id', merchantScanId);

  const { error } = await db()
    .from('scan_accessibility')
    .insert({ merchant_scan_id: merchantScanId, ...data });

  if (error) throw new Error(`Failed to upsert accessibility: ${error.message}`);
}

export async function getAccessibility(merchantScanId: string) {
  const { data, error } = await db()
    .from('scan_accessibility')
    .select('*')
    .eq('merchant_scan_id', merchantScanId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get accessibility: ${error.message}`);
  return data;
}

// ============================================
// SCAN BATCHES
// ============================================

export async function createBatch(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    batch_type?: string;
    target_domains: string[];
    scan_config?: Record<string, unknown>;
  },
): Promise<ScanBatch> {
  const { data: batch, error } = await db()
    .from('scan_batches')
    .insert({
      tenant_id: tenantId,
      name: data.name,
      description: data.description,
      batch_type: data.batch_type || 'manual',
      target_domains: data.target_domains,
      scan_config: data.scan_config || {},
      total_targets: data.target_domains.length,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create batch: ${error.message}`);
  return batch;
}

export async function updateBatch(
  id: string,
  data: Partial<{
    status: string;
    completed_targets: number;
    failed_targets: number;
    started_at: string;
    completed_at: string;
  }>,
): Promise<void> {
  const { error } = await db()
    .from('scan_batches')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(`Failed to update batch: ${error.message}`);
}

export async function getBatch(id: string): Promise<ScanBatch | null> {
  const { data, error } = await db()
    .from('scan_batches')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to get batch: ${error.message}`);
  return data;
}

// ============================================
// DEMAND INTELLIGENCE
// ============================================

export async function getDemandIntelligence(filters: {
  source?: string;
  metric?: string;
  category?: string;
  region?: string;
  limit?: number;
} = {}): Promise<Array<{
  id: string;
  source: string;
  metric: string;
  value: number;
  unit?: string;
  category?: string;
  region?: string;
  description?: string;
  source_url?: string;
  confidence: string;
}>> {
  let query = db()
    .from('demand_intelligence')
    .select('*');

  if (filters.source) query = query.eq('source', filters.source);
  if (filters.metric) query = query.eq('metric', filters.metric);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.region) query = query.eq('region', filters.region);

  query = query.order('collected_at', { ascending: false }).limit(filters.limit || 50);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get demand intelligence: ${error.message}`);
  return data || [];
}

export async function insertDemandIntelligence(
  rows: Array<{
    source: string;
    metric: string;
    value: number;
    unit?: string;
    category?: string;
    region?: string;
    period?: string;
    description?: string;
    source_url?: string;
    confidence?: string;
    collected_at?: string;
  }>,
): Promise<void> {
  const { error } = await db()
    .from('demand_intelligence')
    .insert(rows.map(r => ({
      ...r,
      confidence: r.confidence || 'medium',
      collected_at: r.collected_at || new Date().toISOString(),
    })));

  if (error) throw new Error(`Failed to insert demand intelligence: ${error.message}`);
}

// ============================================
// PROTOCOL ADOPTION STATS
// ============================================

export async function getProtocolAdoption(tenantId: string): Promise<Record<string, {
  detected: number;
  functional: number;
  total: number;
  adoption_rate: number;
}>> {
  const { data: scans, error: scanError } = await db()
    .from('merchant_scans')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('scan_status', 'completed');

  if (scanError) throw new Error(`Failed to get scans: ${scanError.message}`);
  if (!scans || scans.length === 0) return {};

  const scanIds = scans.map(s => s.id);
  const total = scanIds.length;

  const { data: protocols, error: protoError } = await db()
    .from('scan_protocol_results')
    .select('protocol, detected, is_functional')
    .in('merchant_scan_id', scanIds);

  if (protoError) throw new Error(`Failed to get protocol results: ${protoError.message}`);

  const adoption: Record<string, { detected: number; functional: number; total: number; adoption_rate: number }> = {};

  for (const p of (protocols || [])) {
    if (!adoption[p.protocol]) {
      adoption[p.protocol] = { detected: 0, functional: 0, total, adoption_rate: 0 };
    }
    if (p.detected) {
      adoption[p.protocol].detected++;
      if (p.is_functional) adoption[p.protocol].functional++;
    }
  }

  for (const key of Object.keys(adoption)) {
    adoption[key].adoption_rate = Math.round((adoption[key].detected / total) * 100);
  }

  return adoption;
}
