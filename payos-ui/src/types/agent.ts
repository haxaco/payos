export interface Agent {
  id: string;
  name: string;
  description: string;
  type: 'payment' | 'treasury' | 'compliance' | 'custom';
  status: 'active' | 'paused' | 'disabled';
  
  // === Parent Account ===
  parentAccount: {
    id: string;
    type: 'person' | 'business';
    name: string;
    verificationTier: 1 | 2 | 3;
  };
  
  // === KYA Verification ===
  kya: {
    tier: 0 | 1 | 2 | 3;
    status: 'unverified' | 'pending' | 'verified' | 'suspended';
    verifiedAt: string | null;
    expiresAt: string | null;  // Annual re-verification
    agentLimits: {
      perTransaction: number;
      daily: number;
      monthly: number;
    };
    effectiveLimits: {
      perTransaction: number;
      daily: number;
      monthly: number;
      cappedByParent: boolean;
    };
    requirements: KYARequirement[];
  };
  
  // === Authentication ===
  auth: {
    methods: ('api_key' | 'oauth' | 'pk_jwt' | 'x402' | 'mtls')[];
    oauth: {
      clientId: string;
      clientSecretHint: string;  // Last 4 chars: "...3d4e"
      clientSecretCreatedAt: string;
      scopes: string[];
    } | null;
    pkJwt: {
      publicKeyFingerprint: string;
      algorithm: 'RS256' | 'ES256';
      registeredAt: string;
      jwksUrl: string;
    } | null;
    x402: {
      enabled: boolean;
      walletAddress: string;
      publicKey: string;
      network: 'base' | 'ethereum' | 'solana';
    };
    mtls: {
      enabled: boolean;
      certificateFingerprint: string;
      expiresAt: string;
    } | null;
  };
  
  // Permissions & Limits
  permissions: {
    transactions: {
      initiate: boolean;
      approve: boolean;
      view: boolean;
    };
    streams: {
      initiate: boolean;
      modify: boolean;
      pause: boolean;
      terminate: boolean;
      view: boolean;
    };
    accounts: {
      view: boolean;
      create: boolean;
    };
    treasury: {
      view: boolean;
      rebalance: boolean;
    };
    maxTransactionAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
    allowedCurrencies: string[];
    allowedCountries: string[];
    requiresApproval: boolean;
    approvalThreshold: number;
    capabilities: ('pay' | 'receive' | 'query' | 'approve')[];
  };
  
  // Stream limits
  limits: {
    perTransaction: number;
    daily: number;
    monthly: number;
    maxActiveStreams: number;
    maxFlowRatePerStream: number;
    maxTotalStreamOutflow: number;
  };
  
  // Usage Stats
  stats: {
    totalTransactions: number;
    totalVolume: number;
    lastActive: string;
    successRate: number;
  };
  
  // Stream stats
  streamStats: {
    activeStreams: number;
    totalOutflow: number;
    streamsManaged: string[];
  };
  
  // Balance (agents can hold funds)
  balance: {
    usd: number;
    usdc: number;
  };
  
  // Linked Business
  linkedBusinessId: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface KYARequirement {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'not_required';
  completedAt: string | null;
  requiredForTier: number;  // Minimum tier that requires this
}