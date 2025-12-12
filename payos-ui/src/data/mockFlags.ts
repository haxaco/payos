export interface ComplianceFlag {
  id: string;
  type: 'transaction' | 'account';
  riskLevel: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: string;
  
  // For transaction flags
  transactionId?: string;
  transaction?: {
    id: string;
    amount: number;
    fromAccount: string;
    fromAccountType: 'person' | 'business';
    fromCountry: string;
    toAccount: string;
    toAccountType: 'person' | 'business';
    toCountry: string;
    createdAt: string;
  };
  
  // For account flags
  accountId?: string;
  account?: {
    id: string;
    name: string;
    type: 'person' | 'business';
    country: string;
  };
  
  // AI Analysis - THE KEY PART
  aiAnalysis: {
    reasons: string[];
    riskScore: number; // 0-100
    riskExplanation: string;
    patternMatches: {
      description: string;
      percentage: number;
    }[];
    suggestedActions: {
      action: string;
      completed: boolean;
    }[];
  };
  
  // Timeline
  timeline: {
    timestamp: string;
    event: string;
    status: 'completed' | 'pending';
  }[];
  
  // Resolution (if resolved)
  resolution?: {
    action: string;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}

export const mockFlags: ComplianceFlag[] = [
  {
    id: 'flag_001',
    type: 'transaction',
    riskLevel: 'medium',
    status: 'pending',
    createdAt: '2025-12-05T13:58:02Z',
    transactionId: 'txn_1a2b3c4d',
    transaction: {
      id: 'txn_1a2b3c4d',
      amount: 2200,
      fromAccount: 'StartupXYZ',
      fromAccountType: 'business',
      fromCountry: 'USA',
      toAccount: 'Juan Perez',
      toAccountType: 'person',
      toCountry: 'MEX',
      createdAt: '2025-12-05T13:58:00Z'
    },
    aiAnalysis: {
      reasons: [
        'First transaction between these accounts',
        'Recipient (Juan Perez) has Tier 1 KYC only',
        'Sender velocity unusual: 5 new recipients in 48 hours',
        'Amount just below $2,500 monitoring threshold'
      ],
      riskScore: 62,
      riskExplanation: 'This pattern matches characteristics of both legitimate first-time contractor payments and potential structuring attempts. The combination of new relationship, low recipient verification, and unusual sender velocity warrants review.',
      patternMatches: [
        { description: 'Legitimate first-time contractor payments', percentage: 45 },
        { description: 'Structuring attempts in similar corridors', percentage: 12 }
      ],
      suggestedActions: [
        { action: 'Verify sender-recipient relationship (contract/invoice)', completed: true },
        { action: 'Request recipient KYC upgrade to Tier 2', completed: false },
        { action: "Review sender's recent recipient additions", completed: false }
      ]
    },
    timeline: [
      { timestamp: '13:58:00 UTC', event: 'Transaction initiated', status: 'completed' },
      { timestamp: '13:58:01 UTC', event: 'Compliance check triggered', status: 'completed' },
      { timestamp: '13:58:02 UTC', event: 'AI analysis: Medium risk (62%)', status: 'completed' },
      { timestamp: '13:58:02 UTC', event: 'Transaction held for review', status: 'completed' },
      { timestamp: 'Pending', event: 'Awaiting compliance decision', status: 'pending' }
    ]
  },
  {
    id: 'flag_002',
    type: 'transaction',
    riskLevel: 'high',
    status: 'pending',
    createdAt: '2025-12-06T09:29:32Z',
    transactionId: 'txn_5e6f7g8h',
    transaction: {
      id: 'txn_5e6f7g8h',
      amount: 9800,
      fromAccount: 'StartupXYZ',
      fromAccountType: 'business',
      fromCountry: 'USA',
      toAccount: '3 recipients',
      toAccountType: 'person',
      toCountry: 'PER',
      createdAt: '2025-12-06T09:28:00Z'
    },
    aiAnalysis: {
      reasons: [
        'Batch of 3 transactions totaling $9,800 initiated within 2 minutes',
        'Individual amounts: $3,400 + $3,200 + $3,200 — all below $5K threshold',
        'Same sender to new recipients in same country (Peru)',
        'Total just below $10,000 reporting requirement'
      ],
      riskScore: 78,
      riskExplanation: 'This pattern is consistent with structuring behavior — splitting transactions to avoid reporting thresholds. The rapid succession, new recipients, and strategic amounts raise significant concerns.',
      patternMatches: [
        { description: 'Structuring attempts', percentage: 67 },
        { description: 'Legitimate batch payroll', percentage: 15 }
      ],
      suggestedActions: [
        { action: 'Request documentation for all 3 recipients', completed: false },
        { action: 'Review sender account for previous similar patterns', completed: false },
        { action: 'File SAR if structuring confirmed', completed: false },
        { action: 'Consider temporary account suspension', completed: false }
      ]
    },
    timeline: [
      { timestamp: '09:28:00 UTC', event: 'First transaction initiated ($3,400)', status: 'completed' },
      { timestamp: '09:28:45 UTC', event: 'Second transaction initiated ($3,200)', status: 'completed' },
      { timestamp: '09:29:30 UTC', event: 'Third transaction initiated ($3,200)', status: 'completed' },
      { timestamp: '09:29:31 UTC', event: 'Velocity rule triggered: 3 txns in 2 min', status: 'completed' },
      { timestamp: '09:29:32 UTC', event: 'AI analysis: High risk — potential structuring', status: 'completed' },
      { timestamp: '09:29:32 UTC', event: 'All transactions held for review', status: 'completed' }
    ]
  },
  {
    id: 'flag_003',
    type: 'account',
    riskLevel: 'high',
    status: 'pending',
    createdAt: '2025-12-04T14:02:00Z',
    accountId: 'acc_biz_001',
    account: {
      id: 'acc_biz_001',
      name: 'TechCorp Inc',
      type: 'business',
      country: 'USA'
    },
    aiAnalysis: {
      reasons: [
        'Payout volume increased 340% vs. previous month',
        '5 new contractors added in 48 hours',
        '3 payouts to previously unseen countries (Peru, Chile, Ecuador)',
        'Average payout size increased from $1,800 to $4,200'
      ],
      riskScore: 78,
      riskExplanation: 'Dramatic change in account behavior. While this could indicate legitimate business growth, the rapid expansion to new corridors and increased transaction sizes warrants verification.',
      patternMatches: [
        { description: 'Business expansion (legitimate growth)', percentage: 40 },
        { description: 'Account takeover indicators', percentage: 25 },
        { description: 'Money laundering through contractor payments', percentage: 18 }
      ],
      suggestedActions: [
        { action: 'Contact account owner to verify business changes', completed: false },
        { action: 'Request documentation for new contractors', completed: false },
        { action: 'Review recent login activity and IP addresses', completed: false },
        { action: 'Temporarily reduce payout limits until verified', completed: false }
      ]
    },
    timeline: [
      { timestamp: 'Dec 4, 14:00 UTC', event: 'Velocity alert: Volume +340% MoM', status: 'completed' },
      { timestamp: 'Dec 4, 14:01 UTC', event: 'New corridor alert: Peru, Chile, Ecuador added', status: 'completed' },
      { timestamp: 'Dec 4, 14:02 UTC', event: 'AI analysis: High risk — unusual pattern', status: 'completed' },
      { timestamp: 'Dec 4, 14:02 UTC', event: 'Account flagged for review', status: 'completed' }
    ]
  }
];

export function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    USA: '🇺🇸',
    ARG: '🇦🇷',
    BRA: '🇧🇷',
    MEX: '🇲🇽',
    COL: '🇨🇴',
    PER: '🇵🇪',
    CHL: '🇨🇱',
    ECU: '🇪🇨',
  };
  return flags[code] || '🌎';
}
