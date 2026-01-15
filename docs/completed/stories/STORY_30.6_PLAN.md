# Story 30.6: Migrate Agent and Wallet Routes - Implementation Plan

**Story:** 30.6  
**Epic:** 30 - Structured Response System  
**Status:** Ready for Implementation  
**Points:** 2  
**Priority:** P1

## Summary

This document outlines the systematic changes needed to migrate agent and wallet routes to structured responses, following the established pattern from Stories 30.4 and 30.5.

## Files to Update

### 1. `/apps/api/src/routes/agents.ts` (830 lines)

**Routes to Migrate:**
- GET /v1/agents - List agents
- POST /v1/agents - Create agent
- GET /v1/agents/:id - Get agent
- PATCH /v1/agents/:id - Update agent
- DELETE /v1/agents/:id - Delete agent
- POST /v1/agents/:id/suspend - Suspend agent
- POST /v1/agents/:id/activate - Activate agent
- GET /v1/agents/:id/streams - Get agent streams
- GET /v1/agents/:id/limits - Get agent limits
- POST /v1/agents/:id/verify - Verify agent (KYA)
- POST /v1/agents/:id/rotate-token - Rotate token

### 2. Wallet Routes (to be located and migrated)

**Expected Routes:**
- GET /v1/agents/:id/wallet - Get wallet
- POST /v1/agents/:id/wallet/fund - Fund wallet
- POST /v1/agents/:id/wallet/withdraw - Withdraw
- GET /v1/agents/:id/wallet/transactions - Transaction history

## Systematic Changes Required

### Pattern 1: Fix Generic Error Returns

**Before:**
```typescript
if (error) {
  console.error('Error fetching agents:', error);
  return c.json({ error: 'Failed to fetch agents' }, 500);
}
```

**After:**
```typescript
if (error) {
  console.error('Error fetching agents:', error);
  throw new Error('Failed to fetch agents from database');
}
```

**Apply to:**
- Line 115: GET /v1/agents error handling
- Line 216: POST /v1/agents create error
- Line 361: PATCH /v1/agents update error
- Line 440: DELETE /v1/agents error
- Line 499: POST /v1/agents/:id/suspend error
- Line 568: POST /v1/agents/:id/activate error
- Line 631: GET /v1/agents/:id/streams error
- Line 724: POST /v1/agents/:id/verify error
- Line 801: POST /v1/agents/:id/rotate-token error

### Pattern 2: Add Agent-Specific Error Codes

#### Error: Business Account Requirement
**Location:** Line 170-172
```typescript
if (parentAccount.type !== 'business') {
  const error: any = new ValidationError('Only business accounts can have agents');
  error.code = ErrorCode.INVALID_ACCOUNT_TYPE;
  error.details = {
    account_id: parentAccountId,
    account_type: parentAccount.type,
    required_type: 'business',
  };
  throw error;
}
```

#### Error: Agent Already Suspended
**Location:** Line 481-483
```typescript
if (existing.status === 'suspended') {
  const error: any = new ValidationError('Agent is already suspended');
  error.code = ErrorCode.AGENT_ALREADY_SUSPENDED;
  error.details = {
    agent_id: id,
    current_status: existing.status,
  };
  throw error;
}
```

#### Error: Agent Already Active
**Location:** Line 550-552
```typescript
if (existing.status === 'active') {
  const error: any = new ValidationError('Agent is already active');
  error.code = ErrorCode.AGENT_ALREADY_ACTIVE;
  error.details = {
    agent_id: id,
    current_status: existing.status,
  };
  throw error;
}
```

#### Error: Agent Has Active Streams
**Location:** Line 424-429
```typescript
if (streamCount && streamCount > 0) {
  const error: any = new ValidationError('Cannot delete agent with active managed streams');
  error.code = ErrorCode.AGENT_HAS_ACTIVE_STREAMS;
  error.details = {
    agent_id: id,
    active_streams: streamCount,
  };
  throw error;
}
```

#### Error: Invalid KYA Tier
**Location:** Line 690-692
```typescript
if (tier < 0 || tier > 3) {
  const error: any = new ValidationError('KYA tier must be between 0 and 3');
  error.details = {
    provided_tier: tier,
    valid_range: '0-3',
  };
  throw error;
}
```

#### Error: Only Users Can Rotate Tokens
**Location:** Line 780-782
```typescript
if (ctx.actorType !== 'user') {
  const error: any = new ValidationError('Only API key holders can rotate agent tokens');
  error.code = ErrorCode.INSUFFICIENT_PERMISSIONS;
  error.details = {
    actor_type: ctx.actorType,
    required_actor_type: 'user',
  };
  throw error;
}
```

### Pattern 3: Add Links to Success Responses

#### POST /v1/agents - Create Agent
**Location:** Line 241-248

**Current:**
```typescript
return c.json({
  data: agent,
  credentials: {
    token: authToken,
    prefix: authTokenPrefix,
    warning: '⚠️ SAVE THIS TOKEN NOW - it will never be shown again!',
  },
}, 201);
```

**Enhanced:**
```typescript
return c.json({
  data: agent,
  credentials: {
    token: authToken,
    prefix: authTokenPrefix,
    warning: '⚠️ SAVE THIS TOKEN NOW - it will never be shown again!',
  },
  links: {
    self: `/v1/agents/${data.id}`,
    parent_account: `/v1/accounts/${parentAccountId}`,
    wallet: `/v1/agents/${data.id}/wallet`,
    limits: `/v1/agents/${data.id}/limits`,
    streams: `/v1/agents/${data.id}/streams`,
  },
  next_actions: [
    {
      action: 'save_token',
      description: 'Save the agent token securely - it cannot be retrieved again',
      required: true,
    },
    {
      action: 'fund_wallet',
      description: 'Fund the agent wallet to enable transactions',
      endpoint: `/v1/agents/${data.id}/wallet/fund`,
      method: 'POST',
    },
    {
      action: 'verify_agent',
      description: 'Complete KYA verification to increase limits',
      endpoint: `/v1/agents/${data.id}/verify`,
      method: 'POST',
    },
  ],
}, 201);
```

#### GET /v1/agents/:id - Get Agent
**Location:** Line 289

**Current:**
```typescript
return c.json({ data: agent });
```

**Enhanced:**
```typescript
return c.json({ 
  data: agent,
  links: {
    self: `/v1/agents/${id}`,
    parent_account: `/v1/accounts/${agent.parentAccountId}`,
    wallet: `/v1/agents/${id}/wallet`,
    limits: `/v1/agents/${id}/limits`,
    streams: `/v1/agents/${id}/streams`,
  },
});
```

#### PATCH /v1/agents/:id - Update Agent
**Location:** Line 389

**Current:**
```typescript
return c.json({ data: agent });
```

**Enhanced:**
```typescript
return c.json({ 
  data: agent,
  links: {
    self: `/v1/agents/${id}`,
    parent_account: `/v1/accounts/${data.parent_account_id}`,
  },
});
```

#### DELETE /v1/agents/:id - Delete Agent
**Location:** Line 455

**Current:**
```typescript
return c.json({ data: { id, deleted: true } });
```

**Enhanced:**
```typescript
return c.json({ 
  data: { id, deleted: true },
  links: {
    parent_account: `/v1/accounts/${existing.parent_account_id}`,
    agents_list: `/v1/agents?parentAccountId=${existing.parent_account_id}`,
  },
});
```

#### POST /v1/agents/:id/suspend - Suspend Agent
**Location:** Line 524

**Current:**
```typescript
return c.json({ data: agent });
```

**Enhanced:**
```typescript
return c.json({ 
  data: agent,
  links: {
    self: `/v1/agents/${id}`,
    activate: `/v1/agents/${id}/activate`,
  },
  next_actions: [
    {
      action: 'activate_agent',
      description: 'Reactivate the agent when ready',
      endpoint: `/v1/agents/${id}/activate`,
      method: 'POST',
    },
  ],
});
```

#### POST /v1/agents/:id/activate - Activate Agent
**Location:** Line 593

**Current:**
```typescript
return c.json({ data: agent });
```

**Enhanced:**
```typescript
return c.json({ 
  data: agent,
  links: {
    self: `/v1/agents/${id}`,
    limits: `/v1/agents/${id}/limits`,
  },
});
```

#### GET /v1/agents/:id/streams - Agent Streams
**Location:** Line 636

**Current:**
```typescript
return c.json({ data: streams });
```

**Enhanced:**
```typescript
return c.json({ 
  data: streams,
  links: {
    self: `/v1/agents/${id}/streams`,
    agent: `/v1/agents/${id}`,
  },
});
```

#### GET /v1/agents/:id/limits - Agent Limits
**Location:** Line 666

**Current:**
```typescript
return c.json({ data: stats });
```

**Enhanced:**
```typescript
return c.json({ 
  data: stats,
  links: {
    self: `/v1/agents/${id}/limits`,
    agent: `/v1/agents/${id}`,
  },
  next_actions: stats.daily.remaining < (stats.daily.limit * 0.2)
    ? [
        {
          action: 'request_limit_increase',
          description: 'Daily limit nearly reached - request an increase',
          endpoint: `/v1/support/limit-increase`,
        },
      ]
    : [],
});
```

#### POST /v1/agents/:id/verify - Verify Agent
**Location:** Line 752

**Current:**
```typescript
return c.json({ data: agent });
```

**Enhanced:**
```typescript
return c.json({ 
  data: agent,
  links: {
    self: `/v1/agents/${id}`,
    limits: `/v1/agents/${id}/limits`,
  },
  next_actions: [
    {
      action: 'check_updated_limits',
      description: 'View increased limits after verification',
      endpoint: `/v1/agents/${id}/limits`,
    },
  ],
});
```

#### POST /v1/agents/:id/rotate-token - Rotate Token
**Location:** Line 820-828

**Current:**
```typescript
return c.json({
  success: true,
  credentials: {
    token: newToken,
    prefix: newTokenPrefix,
    warning: '⚠️ SAVE THIS TOKEN NOW - it will never be shown again!',
  },
  previousTokenRevoked: true,
});
```

**Enhanced:**
```typescript
return c.json({
  success: true,
  data: {
    credentials: {
      token: newToken,
      prefix: newTokenPrefix,
      warning: '⚠️ SAVE THIS TOKEN NOW - it will never be shown again!',
    },
    previousTokenRevoked: true,
  },
  links: {
    self: `/v1/agents/${id}`,
    agent: `/v1/agents/${id}`,
  },
  next_actions: [
    {
      action: 'update_agent_config',
      description: 'Update agent configuration with new token',
      required: true,
    },
    {
      action: 'test_new_token',
      description: 'Test the new token before discarding the old one',
      endpoint: `/v1/agents/${id}`,
    },
  ],
});
```

## Wallet-Specific Error Codes

These will need to be added when we locate the wallet routes:

### WALLET_NOT_FOUND
```typescript
{
  code: 'WALLET_NOT_FOUND',
  details: {
    agent_id: agentId,
    wallet_expected: true,
  },
}
```

### AGENT_SPENDING_LIMIT_EXCEEDED
```typescript
{
  code: 'AGENT_SPENDING_LIMIT_EXCEEDED',
  details: {
    agent_id: agentId,
    limit_type: 'daily', // or 'monthly'
    limit_amount: 1000.00,
    current_spend: 950.00,
    requested_amount: 100.00,
    limit_remaining: 50.00,
    resets_at: '2026-01-02T00:00:00Z',
  },
  suggested_actions: [
    {
      action: 'wait_for_reset',
      description: 'Wait for daily limit to reset',
      available_at: '2026-01-02T00:00:00Z',
    },
    {
      action: 'request_limit_increase',
      description: 'Request a limit increase',
      endpoint: '/v1/support/limit-increase',
    },
    {
      action: 'reduce_amount',
      description: 'Reduce amount to fit within remaining limit',
      max_amount: '50.00',
    },
  ],
}
```

### WALLET_INSUFFICIENT_BALANCE
```typescript
{
  code: 'WALLET_INSUFFICIENT_BALANCE',
  details: {
    wallet_id: walletId,
    agent_id: agentId,
    required_amount: '100.00',
    available_balance: '50.00',
    shortfall: '50.00',
    currency: 'USD',
  },
  suggested_actions: [
    {
      action: 'fund_wallet',
      description: 'Add funds to agent wallet',
      endpoint: `/v1/agents/${agentId}/wallet/fund`,
      min_amount: '50.00',
    },
  ],
}
```

### FUNDING_SOURCE_INSUFFICIENT
```typescript
{
  code: 'INSUFFICIENT_BALANCE', // Reuse existing code
  details: {
    account_id: parentAccountId,
    required_amount: '100.00',
    available_amount: '30.00',
    shortfall: '70.00',
    currency: 'USD',
    context: 'wallet_funding',
  },
  suggested_actions: [
    {
      action: 'top_up_account',
      description: 'Add funds to parent account first',
      endpoint: `/v1/accounts/${parentAccountId}/deposits`,
      min_amount: '70.00',
    },
  ],
}
```

## Implementation Steps

1. ✅ Add `import { ErrorCode } from '@payos/types'` to agents.ts
2. ⏭️ Systematically replace all `return c.json({ error: ... }, 500)` with `throw new Error(...)`
3. ⏭️ Add specific error codes for agent scenarios (business account check, suspend/activate state, active streams, KYA tier, token rotation)
4. ⏭️ Add links to all success responses
5. ⏭️ Add next_actions where contextually appropriate
6. ⏭️ Locate wallet routes and apply same patterns
7. ⏭️ Update tests for new response format

## Testing Plan

### Agent Routes Testing:
```bash
# Test agent creation with links
curl -X POST http://localhost:4000/v1/agents \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "parentAccountId": "acc_business123",
    "name": "Test Agent",
    "description": "Testing structured responses"
  }'
# Should return links to wallet, limits, streams, parent account

# Test business account requirement
curl -X POST http://localhost:4000/v1/agents \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "parentAccountId": "acc_person123",
    "name": "Test Agent"
  }'
# Should return INVALID_ACCOUNT_TYPE error

# Test suspend already-suspended agent
curl -X POST http://localhost:4000/v1/agents/agent_123/suspend \
  -H "Authorization: Bearer $API_KEY"
# Should return AGENT_ALREADY_SUSPENDED if already suspended

# Test delete agent with active streams
curl -X DELETE http://localhost:4000/v1/agents/agent_with_streams \
  -H "Authorization: Bearer $API_KEY"
# Should return AGENT_HAS_ACTIVE_STREAMS with count
```

## Total Changes Estimate

- **Error Handling:** ~10 replacements
- **Error Codes:** ~6 new specific error codes
- **Links:** ~11 routes updated
- **Next Actions:** ~6 routes with contextual actions
- **Wallet Routes:** TBD (need to locate first)

## Next Steps After Completion

1. Story 30.7 - Add Retry Guidance
2. Update integration tests
3. Then proceed to Epic 31 (Context API)

---

**Status:** Implementation Plan Ready  
**Estimated Time:** 1-2 hours for systematic updates



