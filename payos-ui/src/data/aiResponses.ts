import { AIResponse } from '../types/aiAssistant';

export const cannedResponses: Array<{
  patterns: RegExp[];
  response: AIResponse;
}> = [
  // === FLAGGED TRANSACTIONS ===
  {
    patterns: [
      /flagged/i,
      /flags/i,
      /pending.*review/i,
      /compliance.*queue/i
    ],
    response: {
      type: 'list',
      title: 'Compliance Flags',
      summary: 'Found 23 pending flags requiring review',
      stats: {
        'High Risk': 3,
        'Medium Risk': 12,
        'Low Risk': 8
      },
      items: [
        { id: 'flag_002', desc: '$9,800 split to 3 recipients — Potential structuring', risk: 'high' },
        { id: 'flag_003', desc: 'TechCorp velocity increased 340%', risk: 'high' },
        { id: 'flag_001', desc: '$2,200 to new recipient — First transaction', risk: 'medium' }
      ],
      actions: ['View All Flags', 'Show High Risk Only']
    }
  },
  
  // === LARGE TRANSACTIONS ===
  {
    patterns: [
      /over \$?5k/i,
      /over \$?5,?000/i,
      /over 5000/i,
      /large transactions/i,
      /transactions over/i,
      /big.*transactions/i
    ],
    response: {
      type: 'list',
      title: 'Large Transactions This Week',
      summary: 'Found 12 transactions over $5,000',
      stats: {
        'Total': '$84,200',
        'Average': '$7,016',
        'Flagged': 2
      },
      items: [
        { id: 'txn_001', desc: 'TechCorp → Maria Garcia', amount: '$8,500', status: 'completed' },
        { id: 'txn_002', desc: 'StartupXYZ → 3 recipients', amount: '$9,800', status: 'flagged' },
        { id: 'txn_003', desc: 'Acme Inc → Carlos M.', amount: '$6,200', status: 'completed' },
        { id: 'txn_004', desc: 'TechCorp → Ana Souza', amount: '$5,500', status: 'completed' }
      ],
      actions: ['View Full List', 'Export CSV']
    }
  },
  
  // === BULK APPROVE LOW RISK ===
  {
    patterns: [
      /approve.*low.?risk/i,
      /low.?risk.*approve/i,
      /bulk.*approve/i,
      /approve.*all/i
    ],
    response: {
      type: 'action',
      title: 'Bulk Approve Low-Risk Flags',
      summary: 'Found 8 low-risk flags from verified accounts',
      items: [
        { id: 'flag_015', desc: '$1,200 routine contractor payout' },
        { id: 'flag_016', desc: '$800 card spend at verified merchant' },
        { id: 'flag_017', desc: '$2,100 scheduled payment to T2 contractor' }
      ],
      warning: 'This will approve 8 flags without individual review.',
      actions: ['Approve All 8', 'Review Each First']
    }
  },
  
  // === WHY WAS X FLAGGED ===
  {
    patterns: [
      /why.*flag/i,
      /why was.*flag/i,
      /explain.*flag/i,
      /flag.*reason/i
    ],
    response: {
      type: 'text',
      title: 'Flag Analysis: txn_1a2b3c4d',
      text: `The transaction was flagged for the following reasons:

• **First transaction** between StartupXYZ and Juan Perez
• **Recipient KYC tier** is only Tier 1 (ID not yet verified)
• **Sender velocity** unusual: 5 new recipients added in 48 hours
• **Amount** ($2,200) is just below the $2,500 monitoring threshold

**Risk Assessment:** Medium-High (62%)

This pattern matches 45% of legitimate first-time contractor payments and 12% of structuring attempts in similar US→Mexico corridors.

**Recommendation:** Verify the business relationship with a contract or invoice before approving.`,
      actions: ['View Full Flag Details', 'Approve Anyway', 'Request Documentation']
    }
  },
  
  // === TREASURY / FLOAT ===
  {
    patterns: [
      /treasury/i,
      /float/i,
      /liquidity/i,
      /balance.*currency/i,
      /currency.*balance/i
    ],
    response: {
      type: 'list',
      title: 'Treasury Status',
      summary: 'Current float across currencies',
      alert: '⚠️ COP float projected to deplete in 36 hours',
      items: [
        { currency: 'USDC', amount: '$2.4M', status: 'healthy' },
        { currency: 'ARS', amount: '$840K', status: 'adequate' },
        { currency: 'COP', amount: '$45K', status: 'low' },
        { currency: 'MXN', amount: '$320K', status: 'adequate' },
        { currency: 'BRL', amount: '$180K', status: 'adequate' }
      ],
      recommendation: 'Convert $20K USDC → COP to maintain 72-hour buffer',
      actions: ['Execute Rebalance', 'View Treasury Dashboard']
    }
  },
  
  // === FAILED PAYOUTS ===
  {
    patterns: [
      /failed.*payout/i,
      /payout.*failed/i,
      /failed.*transaction/i,
      /declined/i
    ],
    response: {
      type: 'list',
      title: 'Failed Payouts This Week',
      summary: 'Found 3 failed payouts',
      stats: {
        'Total Failed': '$4,850',
        'Most Common': 'Invalid bank details'
      },
      items: [
        { id: 'txn_f01', desc: 'To Carlos M. — Invalid CBU', amount: '$2,000', status: 'failed' },
        { id: 'txn_f02', desc: 'To Ana S. — Bank rejected', amount: '$1,500', status: 'failed' },
        { id: 'txn_f03', desc: 'To Juan P. — Insufficient balance', amount: '$1,350', status: 'failed' }
      ],
      actions: ['View Details', 'Retry All']
    }
  },
  
  // === ACCOUNT SEARCH ===
  {
    patterns: [
      /find.*account/i,
      /search.*account/i,
      /account.*named/i,
      /who is/i
    ],
    response: {
      type: 'list',
      title: 'Account Search Results',
      summary: 'Found 3 matching accounts',
      items: [
        { id: 'acc_001', desc: 'Maria Garcia — Person · Argentina · Active', status: 'T2' },
        { id: 'acc_002', desc: 'TechCorp Inc — Business · USA · Active', status: 'T2' },
        { id: 'acc_003', desc: 'Freelance Agency MX — Business · Mexico · Active', status: 'T1' }
      ],
      actions: ['View First Result', 'Show All']
    }
  }
];

// Default fallback response
export const defaultResponse: AIResponse = {
  type: 'text',
  text: `I can help you with:

• **Compliance:** "Show me flagged transactions" or "Why was this flagged?"
• **Transactions:** "Show transactions over $5K" or "Failed payouts this week"
• **Accounts:** "Find account Maria" or "Accounts pending KYC"
• **Treasury:** "Treasury status" or "Float levels by currency"
• **Actions:** "Approve all low-risk flags"

What would you like to know?`
};

// Query matcher function
export function matchQuery(query: string): AIResponse {
  const normalizedQuery = query.toLowerCase().trim();
  
  for (const { patterns, response } of cannedResponses) {
    if (patterns.some(pattern => pattern.test(normalizedQuery))) {
      return response;
    }
  }
  
  return defaultResponse;
}
