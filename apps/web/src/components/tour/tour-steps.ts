// Tour steps for the Sly dashboard product tour.
//
// Each step targets an element by `selector` (a `data-tour="..."` anchor we
// add to the existing UI). When `selector` is omitted, the step renders
// centered with no spotlight — used for welcome / done.
//
// `href` makes the engine navigate before showing the step, so the anchor is
// guaranteed to be on screen. Tour works on any tenant (empty or seeded) —
// the steps describe what each surface IS, never specific rows.

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id: string;
  /** CSS selector for an element with a `data-tour="..."` attribute. */
  selector?: string;
  title: string;
  body: string;
  placement?: TourPlacement;
  /** If set, router.push(href) before showing this step. */
  href?: string;
}

/** Canonical docs host. Surfaced as a persistent "Docs ↗" link in the engine. */
export const SLY_DOCS_URL = 'https://docs.getsly.ai';

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Sly',
    body:
      'Sly is the agentic-commerce platform — AI agents pay for things, get paid for APIs, and check out as autonomous shoppers. This one-minute tour shows you where each piece lives. Press Esc anytime to exit.',
    placement: 'center',
  },
  {
    id: 'setup',
    selector: '[data-tour="nav-setup-guide"]',
    href: '/dashboard/onboarding',
    title: 'Setup Guide',
    body:
      'Start here. Pick what you want to build — Sly already provisioned a sandbox wallet, agent and protocol enablement. The live test runs a real transaction in one click.',
    placement: 'right',
  },
  {
    id: 'wallets',
    selector: '[data-tour="nav-wallets"]',
    href: '/dashboard/wallets',
    title: 'Wallets',
    body:
      'Where your funds live, scoped to sandbox or production. Sandbox wallets auto-fund with test USDC; live wallets require production approval.',
    placement: 'right',
  },
  {
    id: 'accounts',
    selector: '[data-tour="nav-accounts"]',
    href: '/dashboard/accounts',
    title: 'Accounts',
    body:
      'The owners that hold your wallets — persons or businesses with their own KYC/KYB verification tiers. Wallets and agents both sit under an account.',
    placement: 'right',
  },
  {
    id: 'agents',
    selector: '[data-tour="nav-agents"]',
    href: '/dashboard/agents',
    title: 'Agents',
    body:
      'AI actors that hold limits, KYA tiers, and can sign payments. Each agent gets a key, a wallet and per-period spending policy.',
    placement: 'right',
  },
  {
    id: 'x402',
    selector: '[data-tour="nav-agentic-x402"]',
    href: '/dashboard/agentic-payments/x402/endpoints',
    title: 'x402 — get paid per API call',
    body:
      'The flagship primitive: charge AI agents a micropayment for every request to your API. Sly returns a 402 challenge, the agent pays, your handler runs.',
    placement: 'right',
  },
  {
    id: 'acp',
    selector: '[data-tour="nav-agentic-acp"]',
    href: '/dashboard/agentic-payments/acp/checkouts',
    title: 'ACP — agent checkouts',
    body:
      'Agent-to-merchant checkouts. Shopping agents open a cart, settle in one shot, and you ship.',
    placement: 'right',
  },
  {
    id: 'ap2',
    selector: '[data-tour="nav-agentic-ap2"]',
    href: '/dashboard/agentic-payments/ap2/mandates',
    title: 'AP2 — recurring mandates',
    body:
      'Standing instructions an agent executes within limits you set — perfect for subscriptions, top-ups and autonomous refills.',
    placement: 'right',
  },
  {
    id: 'ucp',
    selector: '[data-tour="nav-agentic-ucp"]',
    href: '/dashboard/agentic-payments/ucp/hosted-checkouts',
    title: 'UCP — universal checkout',
    body:
      'Hosted checkout for stores, including Pix and SPEI corridors. Drop a link, your customer pays.',
    placement: 'right',
  },
  {
    id: 'transactions',
    selector: '[data-tour="nav-transactions"]',
    href: '/dashboard/transfers',
    title: 'Transactions',
    body:
      'The unified ledger. Every settlement, transfer and stream movement shows up here — the answer to "where did my money go?"',
    placement: 'right',
  },
  {
    id: 'compliance',
    selector: '[data-tour="nav-compliance"]',
    href: '/dashboard/compliance',
    title: 'Compliance',
    body:
      'Anything regulatory that needs your attention — KYA/KYB reviews, flagged transactions, sanctions hits. A badge appears on the sidebar item when there\'s something open.',
    placement: 'right',
  },
  {
    id: 'done',
    title: "You're set",
    body:
      'Head to the Setup Guide and click "Run a live test" to see real agentic commerce on Sly in one click. Need depth on any of these? The Docs link in the footer of this tour stays one click away.',
    placement: 'center',
  },
] as const;
