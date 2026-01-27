// Wizard types for guided onboarding flows

export type TemplateId = 'api-monetization' | 'e-commerce' | 'agent-commerce' | 'recurring-payments';

export type WizardStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface WizardStepDefinition {
  id: string;
  title: string;
  description: string;
  shortLabel: string; // Short label for sidebar (e.g., "Create wallet")
  isRequired: boolean;
  estimatedMinutes?: number;
  helpText?: string;
  skipWarning?: string; // Warning shown when user tries to skip
}

export interface WizardProgress {
  templateId: TemplateId;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  stepData: Record<string, unknown>;
  startedAt: string;
  lastActiveAt: string;
  isComplete: boolean;
}

export interface WizardState {
  templateId: TemplateId;
  templateName: string;
  currentStep: number;
  totalSteps: number;
  steps: WizardStepDefinition[];
  completedSteps: Set<string>;
  skippedSteps: Set<string>;
  stepData: Record<string, unknown>;
  isLoading: boolean;
  error: string | null;
}

export interface WizardStepProps {
  step: WizardStepDefinition;
  stepIndex: number;
  totalSteps: number;
  stepData: unknown;
  onComplete: (data?: unknown) => void;
  onSkip: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading: boolean;
}

// Template definitions with their steps
export interface WizardTemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  estimatedTime: string;
  steps: WizardStepDefinition[];
}

// API Types
export interface WizardProgressResponse {
  success: boolean;
  data?: WizardProgress;
  error?: string;
}

export interface SaveWizardProgressRequest {
  templateId: TemplateId;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  stepData: Record<string, unknown>;
}

// Template configurations
export const WIZARD_TEMPLATES: Record<TemplateId, WizardTemplateConfig> = {
  'api-monetization': {
    id: 'api-monetization',
    name: 'API Monetization',
    description: 'Monetize your APIs with pay-per-call pricing using x402',
    icon: 'zap',
    estimatedTime: '~10 min',
    steps: [
      {
        id: 'create-wallet',
        title: 'Create Your Receiving Wallet',
        description: 'This wallet will collect payments from API consumers',
        shortLabel: 'Create wallet',
        isRequired: true,
        estimatedMinutes: 2,
        helpText: 'Your wallet will receive micropayments from x402 API calls. We recommend Solana for lowest fees.',
      },
      {
        id: 'register-endpoint',
        title: 'Register Your API Endpoint',
        description: 'Which API do you want to monetize?',
        shortLabel: 'Register API',
        isRequired: true,
        estimatedMinutes: 3,
        helpText: 'Enter your API base URL and we\'ll generate the x402 payment gateway URL.',
      },
      {
        id: 'configure-pricing',
        title: 'Set Your API Pricing',
        description: 'How much should each API call cost?',
        shortLabel: 'Set prices',
        isRequired: false,
        estimatedMinutes: 2,
        helpText: 'Set price per request. Common ranges: $0.001 for simple calls, $0.01-$0.10 for AI/compute.',
        skipWarning: 'Default pricing of $0.01 per request will be applied.',
      },
      {
        id: 'test-payment',
        title: 'Test Your Integration',
        description: 'Verify everything works with a test payment',
        shortLabel: 'Test payment',
        isRequired: false,
        estimatedMinutes: 3,
        helpText: 'We\'ll simulate an agent making a paid API call using testnet funds.',
        skipWarning: 'You can test later from the dashboard.',
      },
    ],
  },
  'e-commerce': {
    id: 'e-commerce',
    name: 'E-Commerce',
    description: 'Accept payments via hosted checkout for online stores',
    icon: 'shopping-cart',
    estimatedTime: '~12 min',
    steps: [
      {
        id: 'connect-handler',
        title: 'Connect Payment Processor',
        description: 'We\'ll use this to process customer payments',
        shortLabel: 'Connect handler',
        isRequired: true,
        estimatedMinutes: 3,
        helpText: 'Connect your Stripe or PayPal account using secure OAuth.',
      },
      {
        id: 'create-checkout',
        title: 'Create Hosted Checkout',
        description: 'Configure your customer payment page',
        shortLabel: 'Create checkout',
        isRequired: true,
        estimatedMinutes: 4,
        helpText: 'Set your store name, currency, and checkout style (modal/redirect/embedded).',
      },
      {
        id: 'customize-branding',
        title: 'Brand Your Checkout',
        description: 'Match your store\'s look and feel',
        shortLabel: 'Customize',
        isRequired: false,
        estimatedMinutes: 3,
        helpText: 'Upload your logo, set primary color, and add support email.',
        skipWarning: 'Default Sly branding will be used.',
      },
      {
        id: 'test-purchase',
        title: 'Test Purchase',
        description: 'Experience your checkout as a customer',
        shortLabel: 'Test order',
        isRequired: false,
        estimatedMinutes: 2,
        helpText: 'Complete a test purchase using test card: 4242 4242 4242 4242.',
        skipWarning: 'You can test later from the dashboard.',
      },
    ],
  },
  'agent-commerce': {
    id: 'agent-commerce',
    name: 'Agent Commerce',
    description: 'Enable AI agents to make purchases on behalf of users',
    icon: 'bot',
    estimatedTime: '~15 min',
    steps: [
      {
        id: 'connect-handler',
        title: 'Connect Payment Processing',
        description: 'Handle purchases made by AI agents',
        shortLabel: 'Connect handler',
        isRequired: true,
        estimatedMinutes: 3,
        helpText: 'Agents will use this to complete purchases. Same setup as regular checkout.',
      },
      {
        id: 'create-agent-wallet',
        title: 'Fund Your Agent Wallet',
        description: 'Agents draw from this budget to make purchases',
        shortLabel: 'Create wallet',
        isRequired: true,
        estimatedMinutes: 3,
        helpText: 'Create a dedicated wallet for agent spending. Fund it with USDC.',
      },
      {
        id: 'configure-limits',
        title: 'Set Agent Spending Controls',
        description: 'Define what agents can and cannot do',
        shortLabel: 'Set limits',
        isRequired: false,
        estimatedMinutes: 4,
        helpText: 'Set per-transaction limits, daily spending limits, and approval thresholds.',
        skipWarning: 'Default limits of $100/tx and $1000/day will be applied.',
      },
      {
        id: 'test-agent-purchase',
        title: 'Test Agent Purchase',
        description: 'See how AI agents complete checkouts',
        shortLabel: 'Test agent',
        isRequired: false,
        estimatedMinutes: 3,
        helpText: 'We\'ll simulate an agent buying a test item and watch the approval flow.',
        skipWarning: 'You can test later from the dashboard.',
      },
    ],
  },
  'recurring-payments': {
    id: 'recurring-payments',
    name: 'Recurring Payments',
    description: 'Set up subscription/mandate-based agent payments',
    icon: 'repeat',
    estimatedTime: '~12 min',
    steps: [
      {
        id: 'create-wallet',
        title: 'Create Subscription Wallet',
        description: 'Recurring payments will be deposited here',
        shortLabel: 'Create wallet',
        isRequired: true,
        estimatedMinutes: 2,
        helpText: 'This wallet will receive all recurring payment deposits.',
      },
      {
        id: 'register-agent',
        title: 'Register Your AI Agent',
        description: 'This is the entity that will make recurring payments',
        shortLabel: 'Register agent',
        isRequired: true,
        estimatedMinutes: 3,
        helpText: 'Agents need identity to create mandates. Set KYA tier based on risk.',
      },
      {
        id: 'create-mandate',
        title: 'Create Payment Mandate',
        description: 'Define the rules for automated payments',
        shortLabel: 'Create mandate',
        isRequired: true,
        estimatedMinutes: 4,
        helpText: 'Mandates authorize the agent to make recurring payments within defined rules.',
      },
      {
        id: 'test-execution',
        title: 'Test Mandate Execution',
        description: 'Verify the mandate executes correctly',
        shortLabel: 'Test mandate',
        isRequired: false,
        estimatedMinutes: 3,
        helpText: 'Trigger one mandate payment and verify funds transfer correctly.',
        skipWarning: 'You can test later from the dashboard.',
      },
    ],
  },
};

// Map legacy template IDs to wizard template IDs
export const LEGACY_TEMPLATE_MAP: Record<string, TemplateId> = {
  'api-monetization': 'api-monetization',
  'x402-micropayments': 'api-monetization',
  'e-commerce': 'e-commerce',
  'ucp-checkout': 'e-commerce',
  'agent-commerce': 'agent-commerce',
  'acp-agent-checkout': 'agent-commerce',
  'recurring-payments': 'recurring-payments',
  'ap2-mandates': 'recurring-payments',
};
