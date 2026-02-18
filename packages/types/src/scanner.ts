// ============================================
// SCANNER TYPES (Epic 56)
// ============================================

export interface MerchantScan {
  id: string;
  tenant_id: string;
  domain: string;
  url: string;
  merchant_name?: string;
  merchant_category?: MerchantCategory;
  country_code?: string;
  region?: ScanRegion;

  readiness_score: number;
  protocol_score: number;
  data_score: number;
  accessibility_score: number;
  checkout_score: number;

  business_model?: BusinessModel;
  scan_status: ScanStatus;
  last_scanned_at?: string;
  scan_duration_ms?: number;
  scan_version: string;
  error_message?: string;

  protocol_results?: ScanProtocolResult[];
  structured_data?: ScanStructuredData;
  accessibility?: ScanAccessibility;

  created_at: string;
  updated_at: string;
}

export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed' | 'stale';
export type ScanRegion = 'latam' | 'north_america' | 'europe' | 'apac' | 'africa' | 'mena';
export type MerchantCategory =
  | 'retail' | 'saas' | 'marketplace' | 'restaurant' | 'b2b'
  | 'travel' | 'fintech' | 'healthcare' | 'media' | 'other';

export type AgenticProtocol =
  | 'ucp' | 'acp' | 'ap2' | 'x402' | 'mcp' | 'nlweb'
  | 'visa_vic' | 'mastercard_agentpay';

export type DetectionStatus = 'confirmed' | 'eligible' | 'platform_enabled' | 'not_detected' | 'not_applicable';
export type DetectionConfidence = 'high' | 'medium' | 'low';
export type BusinessModel = 'retail' | 'saas' | 'marketplace' | 'api_provider' | 'content';

export interface ScanProtocolResult {
  id: string;
  merchant_scan_id: string;
  protocol: AgenticProtocol;
  status: DetectionStatus;
  confidence: DetectionConfidence;
  detected?: boolean;
  eligibility_signals?: string[];
  detection_method?: string;
  endpoint_url?: string;
  capabilities: Record<string, unknown>;
  response_time_ms?: number;
  is_functional?: boolean;
  last_verified_at?: string;
  created_at: string;
}

export interface ScanStructuredData {
  id: string;
  merchant_scan_id: string;
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
  sample_products: SampleProduct[];
  created_at: string;
}

export interface SampleProduct {
  name: string;
  price?: number;
  currency?: string;
  availability?: string;
  sku?: string;
  image_url?: string;
  url?: string;
}

export interface ScanAccessibility {
  id: string;
  merchant_scan_id: string;
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
  created_at: string;
}

export interface ScanBatch {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  batch_type: 'manual' | 'scheduled' | 'report' | 'prospect_list';
  target_domains: string[];
  scan_config: Record<string, unknown>;
  total_targets: number;
  completed_targets: number;
  failed_targets: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanSnapshot {
  id: string;
  snapshot_date: string;
  snapshot_period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  total_merchants_scanned: number;
  ucp_adoption_rate: number;
  acp_adoption_rate: number;
  ap2_adoption_rate: number;
  x402_adoption_rate: number;
  mcp_adoption_rate: number;
  any_protocol_adoption_rate: number;
  schema_org_adoption_rate: number;
  json_ld_adoption_rate: number;
  agent_blocking_rate: number;
  captcha_rate: number;
  guest_checkout_rate: number;
  avg_readiness_score: number;
  avg_protocol_score: number;
  avg_data_score: number;
  scores_by_category: Record<string, { avg_score: number; count: number }>;
  scores_by_region: Record<string, { avg_score: number; count: number }>;
  scores_by_platform: Record<string, { avg_score: number; count: number }>;
  created_at: string;
}

export const READINESS_GRADES = {
  A: { min: 80, label: 'Agent-Ready', color: '#22c55e' },
  B: { min: 60, label: 'Partially Ready', color: '#84cc16' },
  C: { min: 40, label: 'Basic Support', color: '#eab308' },
  D: { min: 20, label: 'Minimal', color: '#f97316' },
  F: { min: 0,  label: 'Not Ready', color: '#ef4444' },
} as const;

export type ReadinessGrade = keyof typeof READINESS_GRADES;
