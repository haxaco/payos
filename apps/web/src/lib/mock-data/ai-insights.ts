// Mock AI Insights Data
// Future: Replace with API call to /v1/insights

export interface AiInsight {
  id: string;
  type: string;
  icon: string;
  severity: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  action?: { label: string; href: string };
  generatedAt: string;
}

export const mockAiInsights: AiInsight[] = [
  {
    id: 'insight-1',
    type: 'treasury_optimization',
    icon: '💡',
    severity: 'info',
    title: 'Treasury Optimization',
    message: 'MXN corridor is 23% over-funded. Consider rebalancing $12,400 to BRL corridor.',
    action: { label: 'Review Treasury', href: '/dashboard/treasury' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-2',
    type: 'stream_health',
    icon: '⚠️',
    severity: 'warning',
    title: 'Stream Health Alert',
    message: '3 streams will run dry within 48 hours. Auto top-up is disabled for these accounts.',
    action: { label: 'View Streams', href: '/dashboard/streams?health=critical' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-3',
    type: 'agent_limit',
    icon: '🤖',
    severity: 'info',
    title: 'Agent Limit Warning',
    message: 'Payroll Autopilot has used 87% of monthly limit ($87,000 / $100,000).',
    action: { label: 'Adjust Limits', href: '/dashboard/agents' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-4',
    type: 'compliance',
    icon: '🛡️',
    severity: 'warning',
    title: 'Compliance Review Needed',
    message: '2 transactions flagged for manual review. Average review time: 4 hours.',
    action: { label: 'Review Flags', href: '/dashboard/compliance' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-5',
    type: 'automation_success',
    icon: '✅',
    severity: 'success',
    title: 'Automation Performing Well',
    message: 'Agents processed 142 transactions today with 99.3% success rate.',
    action: undefined,
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-6',
    type: 'fx_opportunity',
    icon: '📈',
    severity: 'info',
    title: 'FX Rate Opportunity',
    message: 'USD/BRL rate is 2.1% below 30-day average. Good time for BRL payouts.',
    action: { label: 'View Rates', href: '/dashboard/treasury' },
    generatedAt: new Date().toISOString(),
  },
];

