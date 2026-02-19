// ============================================
// DEMAND INTELLIGENCE TYPES (Epic 56)
// ============================================

export interface DemandIntelligence {
  id: string;
  source: string;
  metric: string;
  value: number;
  unit?: string;
  category?: string;
  region?: string;
  period?: string;
  description?: string;
  source_url?: string;
  confidence: 'high' | 'medium' | 'low';
  collected_at: string;
  created_at: string;
}

// ============================================
// AGENT SHOPPING TEST TYPES (Story 56.20)
// ============================================

export type AgentTestStepName = 'discovery' | 'selection' | 'cart' | 'checkout' | 'payment';

export type AgentTestBlockerType =
  | 'no_structured_data' | 'javascript_required' | 'captcha_blocked'
  | 'no_guest_checkout' | 'no_api_checkout' | 'no_agent_protocol'
  | 'payment_wall' | 'robots_blocked' | 'geo_restricted'
  | 'rate_limited' | 'unknown_error';

export interface AgentTestRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  detail: string;
  estimated_impact?: string;
}

export interface AgentShoppingTestResult {
  id: string;
  merchant_scan_id: string;
  domain: string;
  test_type: 'browse' | 'search' | 'add_to_cart' | 'checkout' | 'full_flow';
  status: 'passed' | 'failed' | 'partial' | 'blocked';
  steps: AgentTestStep[];
  blockers: AgentTestBlocker[];
  total_steps: number;
  completed_steps: number;
  success_rate: number;
  failure_point?: {
    step: AgentTestStepName;
    blocker: AgentTestBlockerType;
    detail: string;
  };
  estimated_monthly_agent_visits?: number;
  estimated_lost_conversions?: number;
  estimated_lost_revenue_usd?: number;
  recommendations: AgentTestRecommendation[];
  duration_ms: number;
  agent_model?: string;
  tested_at: string;
  created_at: string;
}

export interface AgentTestStep {
  step_number: number;
  action: string;
  description: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  error?: string;
  data?: Record<string, unknown>;
}

export interface AgentTestBlocker {
  type: 'captcha' | 'auth_wall' | 'javascript_required' | 'bot_blocked' | 'no_structured_data' | 'checkout_friction' | 'other';
  description: string;
  severity: 'blocking' | 'degraded' | 'minor';
  step_number?: number;
}

// ============================================
// AGENT BEHAVIOR OBSERVATORY TYPES (Story 56.21)
// ============================================

export type ObservationType =
  | 'ai_search_result'
  | 'product_recommendation'
  | 'protocol_announcement'
  | 'agent_marketplace'
  | 'news_mention'
  | 'manual';

export type ObservationSource =
  | 'perplexity'
  | 'chatgpt'
  | 'google_ai'
  | 'bing_copilot'
  | 'mcp_registry'
  | 'press'
  | 'social'
  | 'manual'
  | 'scan_drift';

export interface AgentObservation {
  id: string;
  domain: string;
  merchant_scan_id?: string;
  observation_type: ObservationType;
  source: ObservationSource;
  query?: string;
  evidence: string;
  evidence_url?: string;
  metadata?: Record<string, unknown>;
  confidence: 'high' | 'medium' | 'low';
  observed_at: string;
  created_at: string;
}

export interface MerchantAIPresence {
  domain: string;
  merchant_name?: string;
  observation_count: number;
  source_breakdown: Record<string, number>;
  type_breakdown: Record<string, number>;
  latest_observation: string;
  readiness_score?: number;
  has_agent_protocol: boolean;
}

export interface AgentActivityReport {
  period_start: string;
  period_end: string;
  total_observations: number;
  unique_merchants: number;
  top_merchants: MerchantAIPresence[];
  by_source: Record<string, number>;
  by_type: Record<string, number>;
  latam_coverage: {
    total: number;
    merchants: string[];
  };
  generated_at: string;
}

export interface DemandBrief {
  category?: string;
  region?: string;
  narrative: string;
  key_stats: Array<{
    metric: string;
    value: string;
    source: string;
  }>;
  opportunities: string[];
  generated_at: string;
}
