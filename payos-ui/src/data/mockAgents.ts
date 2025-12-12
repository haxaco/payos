import { Agent, KYARequirement } from '../types/agent';

export const kyaRequirements: KYARequirement[] = [
  // Tier 1 Requirements
  {
    id: 'linked_business',
    label: 'Linked to Verified Business',
    description: 'Agent must be owned by a KYB T2+ verified business',
    status: 'completed',
    completedAt: '2025-09-15T10:00:00Z',
    requiredForTier: 1
  },
  {
    id: 'owner_identified',
    label: 'Owner Identified',
    description: 'Individual responsible for agent is named',
    status: 'completed',
    completedAt: '2025-09-15T10:00:00Z',
    requiredForTier: 1
  },
  {
    id: 'oauth_configured',
    label: 'OAuth Authentication',
    description: 'OAuth client credentials configured',
    status: 'completed',
    completedAt: '2025-09-15T10:00:00Z',
    requiredForTier: 1
  },
  
  // Tier 2 Requirements
  {
    id: 'business_t3',
    label: 'Business KYB T3',
    description: 'Linked business must be KYB Tier 3 verified',
    status: 'completed',
    completedAt: '2025-10-01T10:00:00Z',
    requiredForTier: 2
  },
  {
    id: 'pk_jwt_configured',
    label: 'PK-JWT Authentication',
    description: 'Public key registered for JWT signing',
    status: 'completed',
    completedAt: '2025-10-01T10:00:00Z',
    requiredForTier: 2
  },
  {
    id: 'code_attestation',
    label: 'Code Attestation',
    description: 'Signed attestation of agent behavior and scope',
    status: 'completed',
    completedAt: '2025-10-05T10:00:00Z',
    requiredForTier: 2
  },
  {
    id: 'anomaly_detection',
    label: 'Anomaly Detection Enabled',
    description: 'Behavioral monitoring active',
    status: 'completed',
    completedAt: '2025-10-05T10:00:00Z',
    requiredForTier: 2
  },
  
  // Tier 3 Requirements
  {
    id: 'security_audit',
    label: 'Security Audit',
    description: 'Third-party security audit completed',
    status: 'pending',
    completedAt: null,
    requiredForTier: 3
  },
  {
    id: 'insurance',
    label: 'Insurance/Bonding',
    description: 'Liability coverage in place',
    status: 'pending',
    completedAt: null,
    requiredForTier: 3
  },
  {
    id: 'mtls_configured',
    label: 'mTLS Certificate',
    description: 'Mutual TLS certificate issued',
    status: 'not_required',
    completedAt: null,
    requiredForTier: 3
  },
  {
    id: 'incident_runbook',
    label: 'Incident Response Runbook',
    description: 'Documented procedures for agent incidents',
    status: 'pending',
    completedAt: null,
    requiredForTier: 3
  }
];

export const mockAgents: Agent[] = [
  {
    id: 'agent_001',
    name: 'Payroll Autopilot',
    description: 'Automated contractor payments on schedule',
    type: 'payment',
    status: 'active',
    
    parentAccount: {
      id: 'biz_techcorp',
      type: 'business',
      name: 'TechCorp Inc',
      verificationTier: 2
    },
    
    kya: {
      tier: 2,
      status: 'verified',
      verifiedAt: '2025-10-05T10:00:00Z',
      expiresAt: '2026-10-05T10:00:00Z',
      agentLimits: {
        perTransaction: 10000,
        daily: 100000,
        monthly: 500000
      },
      effectiveLimits: {
        perTransaction: 10000,
        daily: 100000,
        monthly: 500000,
        cappedByParent: false
      },
      requirements: kyaRequirements.map(req => ({
        ...req,
        status: req.requiredForTier <= 2 ? 'completed' : 'pending'
      }))
    },
    
    auth: {
      methods: ['oauth', 'pk_jwt', 'x402'],
      oauth: {
        clientId: 'payroll_autopilot_prod',
        clientSecretHint: '...3d4e',
        clientSecretCreatedAt: '2025-09-15T10:00:00Z',
        scopes: ['payments:write', 'accounts:read', 'treasury:read']
      },
      pkJwt: {
        publicKeyFingerprint: 'SHA256:xK3d...9f2a',
        algorithm: 'RS256',
        registeredAt: '2025-10-01T10:00:00Z',
        jwksUrl: 'https://api.payos.dev/.well-known/jwks.json'
      },
      x402: {
        enabled: true,
        walletAddress: '0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a',
        publicKey: 'x402_pk_live_7f8a9b2c3d4e5f6a7b8c9d0e',
        network: 'base'
      },
      mtls: null
    },
    
    permissions: {
      transactions: { initiate: true, approve: false, view: true },
      streams: { initiate: true, modify: true, pause: true, terminate: true, view: true },
      accounts: { view: true, create: false },
      treasury: { view: true, rebalance: false },
      maxTransactionAmount: 10000,
      dailyLimit: 100000,
      monthlyLimit: 500000,
      allowedCurrencies: ['USD', 'USDC'],
      allowedCountries: ['ARG', 'BRA', 'MEX', 'COL'],
      requiresApproval: true,
      approvalThreshold: 5000,
      capabilities: ['pay', 'query']
    },
    
    limits: {
      perTransaction: 10000,
      daily: 100000,
      monthly: 500000,
      maxActiveStreams: 10,
      maxFlowRatePerStream: 5000,
      maxTotalStreamOutflow: 50000
    },
    
    stats: {
      totalTransactions: 1247,
      totalVolume: 892450,
      lastActive: '2025-12-07T14:32:00Z',
      successRate: 99.2
    },
    
    streamStats: {
      activeStreams: 4,
      totalOutflow: 8500,
      streamsManaged: ['stream_002', 'stream_003', 'stream_004', 'stream_006']
    },
    
    balance: { usd: 0, usdc: 25000 },
    linkedBusinessId: 'biz_techcorp',
    createdAt: '2025-09-15T10:00:00Z',
    updatedAt: '2025-12-07T14:32:00Z'
  },
  
  {
    id: 'agent_002',
    name: 'Treasury Rebalancer',
    description: 'Maintains optimal float across currencies',
    type: 'treasury',
    status: 'active',
    
    parentAccount: {
      id: 'biz_techcorp',
      type: 'business',
      name: 'TechCorp Inc',
      verificationTier: 2
    },
    
    kya: {
      tier: 3,
      status: 'verified',
      verifiedAt: '2025-11-01T10:00:00Z',
      expiresAt: '2026-11-01T10:00:00Z',
      agentLimits: {
        perTransaction: 100000,
        daily: 500000,
        monthly: 2000000
      },
      effectiveLimits: {
        perTransaction: 50000,   // Capped by KYB T2 parent
        daily: 200000,          // Capped by KYB T2 parent
        monthly: 500000,        // Capped by KYB T2 parent
        cappedByParent: true
      },
      requirements: kyaRequirements.map(req => ({
        ...req,
        status: 'completed',
        completedAt: '2025-11-01T10:00:00Z'
      }))
    },
    
    auth: {
      methods: ['oauth', 'pk_jwt', 'x402', 'mtls'],
      oauth: {
        clientId: 'treasury_rebalancer_prod',
        clientSecretHint: '...9f8e',
        clientSecretCreatedAt: '2025-10-01T10:00:00Z',
        scopes: ['payments:write', 'treasury:write', 'accounts:read']
      },
      pkJwt: {
        publicKeyFingerprint: 'SHA256:2a3b...7c8d',
        algorithm: 'ES256',
        registeredAt: '2025-10-15T10:00:00Z',
        jwksUrl: 'https://api.payos.dev/.well-known/jwks.json'
      },
      x402: {
        enabled: true,
        walletAddress: '0x2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
        publicKey: 'x402_pk_live_2a3b4c5d6e7f8a9b0c1d2e3f',
        network: 'base'
      },
      mtls: {
        enabled: true,
        certificateFingerprint: 'SHA256:9d8c...5b4a',
        expiresAt: '2026-11-01T10:00:00Z'
      }
    },
    
    permissions: {
      transactions: { initiate: true, approve: true, view: true },
      streams: { initiate: true, modify: true, pause: true, terminate: true, view: true },
      accounts: { view: true, create: false },
      treasury: { view: true, rebalance: true },
      maxTransactionAmount: 100000,
      dailyLimit: 500000,
      monthlyLimit: 2000000,
      allowedCurrencies: ['USD', 'USDC', 'ARS', 'BRL', 'MXN', 'COP'],
      allowedCountries: ['ARG', 'BRA', 'MEX', 'COL', 'USA'],
      requiresApproval: false,
      approvalThreshold: 0,
      capabilities: ['pay', 'receive', 'query']
    },
    
    limits: {
      perTransaction: 50000,
      daily: 200000,
      monthly: 500000,
      maxActiveStreams: 20,
      maxFlowRatePerStream: 25000,
      maxTotalStreamOutflow: 200000
    },
    
    stats: {
      totalTransactions: 89,
      totalVolume: 2450000,
      lastActive: '2025-12-07T12:15:00Z',
      successRate: 100
    },
    
    streamStats: {
      activeStreams: 0,
      totalOutflow: 0,
      streamsManaged: []
    },
    
    balance: { usd: 50000, usdc: 150000 },
    linkedBusinessId: 'biz_techcorp',
    createdAt: '2025-10-01T10:00:00Z',
    updatedAt: '2025-12-07T12:15:00Z'
  },
  
  {
    id: 'agent_003',
    name: 'Compliance Sentinel',
    description: 'Auto-approves low-risk transactions',
    type: 'compliance',
    status: 'active',
    
    parentAccount: {
      id: 'biz_techcorp',
      type: 'business',
      name: 'TechCorp Inc',
      verificationTier: 2
    },
    
    kya: {
      tier: 2,
      status: 'verified',
      verifiedAt: '2025-10-15T10:00:00Z',
      expiresAt: '2026-10-15T10:00:00Z',
      agentLimits: {
        perTransaction: 0,
        daily: 0,
        monthly: 0
      },
      effectiveLimits: {
        perTransaction: 0,
        daily: 0,
        monthly: 0,
        cappedByParent: false
      },
      requirements: kyaRequirements.map(req => ({
        ...req,
        status: req.requiredForTier <= 2 ? 'completed' : 'not_required'
      }))
    },
    
    auth: {
      methods: ['oauth', 'pk_jwt'],
      oauth: {
        clientId: 'compliance_sentinel_prod',
        clientSecretHint: '...1a2b',
        clientSecretCreatedAt: '2025-10-15T10:00:00Z',
        scopes: ['compliance:write', 'accounts:read', 'transactions:read']
      },
      pkJwt: {
        publicKeyFingerprint: 'SHA256:4c5d...8e9f',
        algorithm: 'RS256',
        registeredAt: '2025-10-15T10:00:00Z',
        jwksUrl: 'https://api.payos.dev/.well-known/jwks.json'
      },
      x402: {
        enabled: false,
        walletAddress: '',
        publicKey: '',
        network: 'base'
      },
      mtls: null
    },
    
    permissions: {
      transactions: { initiate: false, approve: true, view: true },
      streams: { initiate: false, modify: false, pause: false, terminate: false, view: true },
      accounts: { view: true, create: false },
      treasury: { view: true, rebalance: false },
      maxTransactionAmount: 0,
      dailyLimit: 0,
      monthlyLimit: 0,
      allowedCurrencies: [],
      allowedCountries: [],
      requiresApproval: false,
      approvalThreshold: 0,
      capabilities: ['query', 'approve']
    },
    
    limits: {
      perTransaction: 0,
      daily: 0,
      monthly: 0,
      maxActiveStreams: 0,
      maxFlowRatePerStream: 0,
      maxTotalStreamOutflow: 0
    },
    
    stats: {
      totalTransactions: 3420,
      totalVolume: 0,
      lastActive: '2025-12-07T14:45:00Z',
      successRate: 98.7
    },
    
    streamStats: {
      activeStreams: 0,
      totalOutflow: 0,
      streamsManaged: []
    },
    
    balance: { usd: 0, usdc: 0 },
    linkedBusinessId: 'biz_techcorp',
    createdAt: '2025-10-15T10:00:00Z',
    updatedAt: '2025-12-07T14:45:00Z'
  },
  
  {
    id: 'agent_004',
    name: 'Vendor Payment Bot',
    description: 'Handles B2B vendor payments',
    type: 'payment',
    status: 'paused',
    
    parentAccount: {
      id: 'biz_acme',
      type: 'business',
      name: 'Acme Corp',
      verificationTier: 1
    },
    
    kya: {
      tier: 1,
      status: 'verified',
      verifiedAt: '2025-11-01T10:00:00Z',
      expiresAt: '2026-11-01T10:00:00Z',
      agentLimits: {
        perTransaction: 1000,
        daily: 10000,
        monthly: 50000
      },
      effectiveLimits: {
        perTransaction: 1000,
        daily: 10000,
        monthly: 50000,
        cappedByParent: false
      },
      requirements: kyaRequirements.map(req => ({
        ...req,
        status: req.requiredForTier <= 1 ? 'completed' : 'pending'
      }))
    },
    
    auth: {
      methods: ['oauth'],
      oauth: {
        clientId: 'vendor_payment_bot_prod',
        clientSecretHint: '...5c6d',
        clientSecretCreatedAt: '2025-11-01T10:00:00Z',
        scopes: ['payments:write', 'accounts:read']
      },
      pkJwt: null,
      x402: {
        enabled: false,
        walletAddress: '',
        publicKey: '',
        network: 'base'
      },
      mtls: null
    },
    
    permissions: {
      transactions: { initiate: true, approve: false, view: true },
      streams: { initiate: false, modify: false, pause: false, terminate: false, view: true },
      accounts: { view: true, create: false },
      treasury: { view: false, rebalance: false },
      maxTransactionAmount: 1000,
      dailyLimit: 10000,
      monthlyLimit: 50000,
      allowedCurrencies: ['USD', 'USDC'],
      allowedCountries: ['USA', 'MEX'],
      requiresApproval: true,
      approvalThreshold: 0,
      capabilities: ['pay']
    },
    
    limits: {
      perTransaction: 1000,
      daily: 10000,
      monthly: 50000,
      maxActiveStreams: 0,
      maxFlowRatePerStream: 0,
      maxTotalStreamOutflow: 0
    },
    
    stats: {
      totalTransactions: 45,
      totalVolume: 127500,
      lastActive: '2025-11-28T09:00:00Z',
      successRate: 97.8
    },
    
    streamStats: {
      activeStreams: 0,
      totalOutflow: 0,
      streamsManaged: []
    },
    
    balance: { usd: 5000, usdc: 0 },
    linkedBusinessId: 'biz_acme',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2025-11-28T09:00:00Z'
  }
];