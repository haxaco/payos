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
  screenshot_url?: string;
}

export interface AgentTestBlocker {
  type: 'captcha' | 'auth_wall' | 'javascript_required' | 'bot_blocked' | 'no_structured_data' | 'checkout_friction' | 'other';
  description: string;
  severity: 'blocking' | 'degraded' | 'minor';
  step_number?: number;
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
