/**
 * Onboarding Types
 * Epic 51, Story 51.1: Type definitions for onboarding state tracking
 */

export type ProtocolId = 'x402' | 'ap2' | 'acp' | 'ucp';

export type OnboardingStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  action_url?: string;
  action_label?: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ProtocolOnboardingState {
  protocol_id: ProtocolId;
  protocol_name: string;
  enabled: boolean;
  prerequisites_met: boolean;
  steps: OnboardingStep[];
  current_step: number;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  is_complete: boolean;
  started_at?: string;
  completed_at?: string;
}

export interface TenantOnboardingState {
  tenant_id: string;
  overall_progress: number;
  has_any_protocol_enabled: boolean;
  has_payment_handler: boolean;
  has_wallet: boolean;
  protocols: Record<ProtocolId, ProtocolOnboardingState>;
  recommended_template?: QuickStartTemplate;
  sandbox_mode: boolean;
  created_at: string;
  updated_at: string;
}

export type QuickStartTemplateId = 'api-monetization' | 'e-commerce' | 'agent-commerce' | 'recurring-payments';

export interface QuickStartTemplate {
  id: QuickStartTemplateId;
  name: string;
  description: string;
  icon: string;
  protocols: ProtocolId[];
  steps: {
    title: string;
    description: string;
    action_url: string;
  }[];
  estimated_time: string;
}

export interface OnboardingProgressUpdate {
  protocol_id: ProtocolId;
  step_id: string;
  status: OnboardingStepStatus;
  metadata?: Record<string, unknown>;
}

// Protocol-specific step definitions
export const PROTOCOL_ONBOARDING_STEPS: Record<ProtocolId, Omit<OnboardingStep, 'status'>[]> = {
  x402: [
    {
      id: 'create-wallet',
      title: 'Create USDC Wallet',
      description: 'Set up a USDC wallet to receive micropayments',
      action_url: '/dashboard/wallets',
      action_label: 'Create Wallet',
    },
    {
      id: 'set-policy',
      title: 'Configure Spending Policy',
      description: 'Define rate limits and pricing for your API endpoints',
      action_url: '/dashboard/agentic-payments/x402/endpoints',
      action_label: 'Set Policy',
    },
    {
      id: 'register-endpoint',
      title: 'Register API Endpoint',
      description: 'Add your first x402-enabled API endpoint',
      action_url: '/dashboard/agentic-payments/x402/endpoints',
      action_label: 'Add Endpoint',
    },
    {
      id: 'test-payment',
      title: 'Test Payment',
      description: 'Make a test payment to verify everything works',
      action_url: '/dashboard/agentic-payments/x402/integration',
      action_label: 'Run Test',
    },
  ],
  ap2: [
    {
      id: 'create-wallet',
      title: 'Create USDC Wallet',
      description: 'Set up a USDC wallet to hold mandate funds',
      action_url: '/dashboard/wallets',
      action_label: 'Create Wallet',
    },
    {
      id: 'register-agent',
      title: 'Register AI Agent',
      description: 'Create an agent identity with appropriate KYA tier',
      action_url: '/dashboard/agents',
      action_label: 'Register Agent',
    },
    {
      id: 'create-mandate',
      title: 'Create Payment Mandate',
      description: 'Set up your first mandate with spending limits',
      action_url: '/dashboard/agentic-payments/ap2/mandates/new',
      action_label: 'Create Mandate',
    },
    {
      id: 'test-execution',
      title: 'Test Mandate Execution',
      description: 'Execute a test payment using the mandate',
      action_url: '/dashboard/agentic-payments/ap2/integration',
      action_label: 'Run Test',
    },
  ],
  acp: [
    {
      id: 'connect-handler',
      title: 'Connect Payment Handler',
      description: 'Connect Stripe, PayPal, or another payment processor',
      action_url: '/dashboard/payment-handlers',
      action_label: 'Connect Handler',
    },
    {
      id: 'create-checkout',
      title: 'Create Test Checkout',
      description: 'Create your first ACP checkout session',
      action_url: '/dashboard/agentic-payments/acp/checkouts/new',
      action_label: 'Create Checkout',
    },
    {
      id: 'complete-checkout',
      title: 'Complete Test Checkout',
      description: 'Complete a checkout to verify the flow',
      action_url: '/dashboard/agentic-payments/acp/integration',
      action_label: 'Test Flow',
    },
  ],
  ucp: [
    {
      id: 'connect-handler',
      title: 'Connect Payment Handler',
      description: 'Connect Stripe, PayPal, or use PayOS native (Pix/SPEI)',
      action_url: '/dashboard/payment-handlers',
      action_label: 'Connect Handler',
    },
    {
      id: 'create-checkout',
      title: 'Create Hosted Checkout',
      description: 'Set up your first UCP hosted checkout',
      action_url: '/dashboard/agentic-payments/ucp/hosted-checkouts',
      action_label: 'Create Checkout',
    },
    {
      id: 'configure-identity',
      title: 'Configure Identity Linking (Optional)',
      description: 'Set up OAuth for customer identity linking',
      action_url: '/dashboard/agentic-payments/ucp/identity',
      action_label: 'Configure OAuth',
    },
    {
      id: 'test-order',
      title: 'Test Order Flow',
      description: 'Complete a test order through the checkout',
      action_url: '/dashboard/agentic-payments/ucp/integration',
      action_label: 'Test Order',
    },
  ],
};

export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: 'api-monetization',
    name: 'API Monetization',
    description: 'Monetize your APIs with pay-per-call pricing using x402',
    icon: 'zap',
    protocols: ['x402'],
    steps: [
      { title: 'Create Wallet', description: 'Set up USDC wallet', action_url: '/dashboard/wallets' },
      { title: 'Add Endpoint', description: 'Register your API', action_url: '/dashboard/agentic-payments/x402/endpoints' },
      { title: 'Set Pricing', description: 'Configure per-call pricing', action_url: '/dashboard/agentic-payments/x402/endpoints' },
    ],
    estimated_time: '10 minutes',
  },
  {
    id: 'e-commerce',
    name: 'E-Commerce',
    description: 'Accept payments for your online store with UCP',
    icon: 'shopping-cart',
    protocols: ['ucp'],
    steps: [
      { title: 'Connect Stripe', description: 'Link your Stripe account', action_url: '/dashboard/payment-handlers' },
      { title: 'Create Checkout', description: 'Set up hosted checkout', action_url: '/dashboard/agentic-payments/ucp/hosted-checkouts' },
      { title: 'Integrate', description: 'Add to your website', action_url: '/dashboard/agentic-payments/ucp/integration' },
    ],
    estimated_time: '15 minutes',
  },
  {
    id: 'agent-commerce',
    name: 'Agent Commerce',
    description: 'Enable AI agents to make purchases with ACP',
    icon: 'bot',
    protocols: ['acp'],
    steps: [
      { title: 'Connect Handler', description: 'Set up payment processor', action_url: '/dashboard/payment-handlers' },
      { title: 'Create Checkout', description: 'Build agent checkout', action_url: '/dashboard/agentic-payments/acp/checkouts/new' },
      { title: 'Test Agent', description: 'Verify agent purchases', action_url: '/dashboard/agentic-payments/acp/integration' },
    ],
    estimated_time: '15 minutes',
  },
  {
    id: 'recurring-payments',
    name: 'Recurring Payments',
    description: 'Set up mandate-based recurring payments with AP2',
    icon: 'repeat',
    protocols: ['ap2'],
    steps: [
      { title: 'Create Wallet', description: 'Set up USDC wallet', action_url: '/dashboard/wallets' },
      { title: 'Register Agent', description: 'Create agent identity', action_url: '/dashboard/agents' },
      { title: 'Create Mandate', description: 'Define payment rules', action_url: '/dashboard/agentic-payments/ap2/mandates/new' },
    ],
    estimated_time: '20 minutes',
  },
];
