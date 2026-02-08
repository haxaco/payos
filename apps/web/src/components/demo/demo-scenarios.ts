export interface DemoStep {
  label: string;
  href: string;
  description: string;
}

export interface DemoScenario {
  id: number;
  name: string;
  tier: 'A' | 'B';
  protocols: string[];
  description: string;
  steps: DemoStep[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  // ── Tier A: Core agent payment flows ──
  {
    id: 1,
    name: 'Shopping Agent',
    tier: 'A',
    protocols: ['ACP', 'UCP'],
    description: 'AI shopping assistant discovers products and completes checkout with policy enforcement.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs and activity feed' },
      { label: 'Agents', href: '/dashboard/agents', description: 'Find AI Shopping Agent' },
      { label: 'Agent Detail', href: '/dashboard/agents/', description: 'View agent KYA tier, volume, linked checkouts' },
      { label: 'ACP Checkouts', href: '/dashboard/agentic-payments/acp/checkouts', description: 'Browse agent-initiated checkouts' },
      { label: 'Checkout Detail', href: '/dashboard/agentic-payments/acp/checkouts/', description: 'Tissot watch purchase with line items' },
      { label: 'UCP Settlements', href: '/dashboard/settlements', description: 'Settlement timeline (Pix/SPEI)' },
    ],
  },
  {
    id: 2,
    name: 'Travel Itinerary',
    tier: 'A',
    protocols: ['UCP'],
    description: 'AI travel agent books flights, hotels, restaurants across 5 vendors in a single EUR session via Google Pay.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'Agents', href: '/dashboard/agents', description: 'Find Hopper Travel Agent' },
      { label: 'Agent Detail', href: '/dashboard/agents/', description: 'Multi-vendor booking history' },
      { label: 'UCP Checkouts', href: '/dashboard/agentic-payments/ucp/checkouts', description: 'Barcelona trip — EUR checkout via Google Pay' },
      { label: 'UCP Settlements', href: '/dashboard/settlements', description: 'SPEI settlement for travel bundle' },
    ],
  },
  {
    id: 3,
    name: 'Pay-Per-Inference',
    tier: 'A',
    protocols: ['x402'],
    description: 'API monetization via x402 micropayments — AI agents pay per API call.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'x402 Endpoints', href: '/dashboard/agentic-payments/x402/endpoints', description: 'Inference, embeddings, image generation APIs' },
      { label: 'Endpoint Detail', href: '/dashboard/agentic-payments/x402/endpoints/', description: 'GPT-4o endpoint — 282K calls, volume discounts' },
      { label: 'Transfers', href: '/dashboard/transfers', description: 'Micropayment transfer history' },
    ],
  },
  {
    id: 4,
    name: 'Corporate Travel',
    tier: 'A',
    protocols: ['AP2', 'ACP', 'UCP'],
    description: 'Corporate travel agent books within policy limits using mandate chain (intent → cart → payment).',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'Agents', href: '/dashboard/agents', description: 'Find Acme Corporate Travel Agent' },
      { label: 'Agent Detail', href: '/dashboard/agents/', description: 'KYA Tier 3 agent with policy enforcement' },
      { label: 'AP2 Mandates', href: '/dashboard/agentic-payments/ap2/mandates', description: 'Intent → Cart → Payment mandate chain' },
      { label: 'Mandate Detail', href: '/dashboard/agentic-payments/ap2/mandates/', description: 'São Paulo trip mandate with executions' },
      { label: 'ACP Checkouts', href: '/dashboard/agentic-payments/acp/checkouts', description: 'Corporate flight + hotel checkouts' },
      { label: 'UCP Settlements', href: '/dashboard/settlements', description: 'Pix settlement to Hotel Fasano' },
    ],
  },
  {
    id: 5,
    name: 'Bill Pay',
    tier: 'B',
    protocols: ['AP2'],
    description: 'Neobank bill prioritization agent — defers low-priority bills until payday.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'Agents', href: '/dashboard/agents', description: 'Find Smart Bill Pay Agent' },
      { label: 'Agent Detail', href: '/dashboard/agents/', description: 'Bill prioritization logic (P0–P3)' },
      { label: 'AP2 Mandates', href: '/dashboard/agentic-payments/ap2/mandates', description: 'Recurring mandates: rent, electric, internet, Netflix' },
      { label: 'Mandate Detail', href: '/dashboard/agentic-payments/ap2/mandates/', description: 'Rent mandate — P0 essential, auto-pay' },
    ],
  },
  {
    id: 6,
    name: 'Gig Payout',
    tier: 'B',
    protocols: ['AP2'],
    description: 'Smart payout agent auto-allocates gig earnings across spending, tax, savings wallets via AP2 mandate.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'Agents', href: '/dashboard/agents', description: 'Find Smart Payout Agent' },
      { label: 'Agent Detail', href: '/dashboard/agents/', description: 'Payout allocation logic' },
      { label: 'AP2 Mandates', href: '/dashboard/agentic-payments/ap2/mandates', description: 'Daily gig payout mandate' },
      { label: 'Mandate Detail', href: '/dashboard/agentic-payments/ap2/mandates/', description: 'Daily payout mandate — 14 executions' },
      { label: 'Transfers', href: '/dashboard/transfers', description: '14 days of daily ride payouts' },
    ],
  },
  {
    id: 7,
    name: 'Remittance',
    tier: 'B',
    protocols: ['AP2', 'UCP'],
    description: 'FX-optimized recurring remittance agent — splits payments when balance is low.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'Agents', href: '/dashboard/agents', description: 'Find Remittance Optimizer Agent' },
      { label: 'Agent Detail', href: '/dashboard/agents/', description: 'FX optimization, balance shield' },
      { label: 'AP2 Mandates', href: '/dashboard/agentic-payments/ap2/mandates', description: 'Monthly remittance mandate' },
      { label: 'Mandate Detail', href: '/dashboard/agentic-payments/ap2/mandates/', description: 'US → MX corridor, 2 executions' },
      { label: 'UCP Settlements', href: '/dashboard/settlements', description: 'SPEI settlement to Elena Rodriguez' },
    ],
  },
  {
    id: 8,
    name: 'Media Micropayments',
    tier: 'B',
    protocols: ['x402'],
    description: 'Licensed content access — AI agents pay per article with tiered pricing.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'x402 Endpoints', href: '/dashboard/agentic-payments/x402/endpoints', description: 'Article, summary, and data extract APIs' },
      { label: 'Endpoint Detail', href: '/dashboard/agentic-payments/x402/endpoints/', description: 'Full-text article — $0.15/call, AI discount tiers' },
    ],
  },
  {
    id: 9,
    name: 'Agent Limits',
    tier: 'A',
    protocols: ['x402', 'AP2'],
    description: 'AI agents consume vendor APIs under budget limits — KYA limits, wallet policies, and per-vendor AP2 mandates with threshold alerts.',
    steps: [
      { label: 'Home', href: '/dashboard', description: 'Overview KPIs' },
      { label: 'Agents', href: '/dashboard/agents', description: 'Find Data Pipeline Agent' },
      { label: 'Agent Detail', href: '/dashboard/agents/', description: 'Budget limits overview, wallet policies' },
      { label: 'KYA Tab', href: '/dashboard/agents/', description: 'Usage bars near limits — 93% daily, 92% monthly' },
      { label: 'Mandates', href: '/dashboard/agentic-payments/ap2/mandates', description: 'Per-vendor API budget mandates' },
      { label: 'Mandate Detail', href: '/dashboard/agentic-payments/ap2/mandates/', description: 'OpenAI monthly budget — $210/$250 used' },
      { label: 'Compliance', href: '/dashboard/compliance', description: 'Budget threshold alerts (HIGH: 93% daily)' },
      { label: 'x402 Endpoints', href: '/dashboard/agentic-payments/x402/endpoints', description: 'Vendor API endpoints consumed by agents' },
    ],
  },
];
