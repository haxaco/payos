# Story 36.5: AP2 Protocol Support - COMPLETE

**Status**: ✅ COMPLETE  
**Points**: 5  
**Completed**: January 3, 2026

## Summary

Implemented AP2 (Google's Agent-to-Agent Protocol) support in the SDK, enabling mandate-based payments where AI agents can execute pre-authorized payments within defined budgets.

## Implementation Details

### 1. AP2Client (`packages/sdk/src/protocols/ap2/client.ts`)

**Key Methods:**
- `createMandate(request)` - Create a new payment mandate
- `listMandates(options)` - List mandates with filtering
- `getMandate(mandateId)` - Get mandate details with execution history
- `executeMandate(mandateId, request)` - Execute payment against mandate
- `cancelMandate(mandateId)` - Cancel an active mandate
- `getAnalytics(period)` - Get AP2-specific analytics

### 2. Types (`packages/sdk/src/protocols/ap2/types.ts`)

**Mandate Types:**
- `intent` - Open-ended intent mandate
- `cart` - Cart-based mandate
- `payment` - Fixed payment amount mandate

**Key Interfaces:**
- `Mandate` - Basic mandate information
- `MandateWithExecutions` - Mandate with execution history
- `CreateMandateRequest` - Create mandate parameters
- `ExecuteMandateRequest` - Execute payment parameters
- `ExecuteMandateResponse` - Execution result with updated mandate state

### 3. Integration

Added to main `PayOS` class:
```typescript
const payos = new PayOS({ apiKey: '...', environment: 'sandbox' });
const mandate = await payos.ap2.createMandate({...});
```

## Testing

```bash
cd packages/sdk && pnpm test
# ✓ 7 AP2Client tests pass
# ✓ 111 total tests pass
```

Test coverage includes:
- Mandate creation
- Mandate listing and filtering
- Mandate execution with balance tracking
- Mandate cancellation
- Analytics retrieval

## Usage Examples

### Create a Mandate

```typescript
const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'sandbox',
});

// Create a payment mandate for an AI agent
const mandate = await payos.ap2.createMandate({
  mandate_id: 'mdt_unique_123',
  mandate_type: 'payment',
  agent_id: 'agent_ai_assistant',
  account_id: 'acct_uuid',
  authorized_amount: 100.00,
  currency: 'USD',
  expires_at: '2026-02-01T00:00:00Z',
});

console.log(`Mandate created with ${mandate.remaining_amount} USD available`);
```

### Execute Payment Against Mandate

```typescript
// AI agent executes a payment
const result = await payos.ap2.executeMandate('mdt_unique_123', {
  amount: 25.00,
  currency: 'USD',
  description: 'Monthly subscription payment',
});

console.log(`Payment executed: ${result.transfer_id}`);
console.log(`Remaining balance: ${result.mandate.remaining_amount} USD`);
console.log(`Execution count: ${result.mandate.execution_count}`);
```

### List Active Mandates

```typescript
const { data, pagination } = await payos.ap2.listMandates({
  status: 'active',
  agent_id: 'agent_ai_assistant',
  limit: 50,
});

console.log(`Found ${data.length} active mandates`);
data.forEach(m => {
  console.log(`- ${m.mandate_id}: ${m.remaining_amount}/${m.authorized_amount} ${m.currency}`);
});
```

### Get Mandate Details

```typescript
const mandate = await payos.ap2.getMandate('mdt_unique_123');

console.log(`Mandate: ${mandate.mandate_type}`);
console.log(`Authorized: ${mandate.authorized_amount} ${mandate.currency}`);
console.log(`Used: ${mandate.used_amount}`);
console.log(`Remaining: ${mandate.remaining_amount}`);
console.log(`Executions: ${mandate.execution_count}`);

// View execution history
mandate.executions.forEach(exec => {
  console.log(`  - ${exec.execution_index}: ${exec.amount} ${exec.currency} (${exec.status})`);
});
```

### Cancel Mandate

```typescript
const result = await payos.ap2.cancelMandate('mdt_unique_123');
console.log(`Mandate cancelled at ${result.cancelled_at}`);
```

### Get Analytics

```typescript
const analytics = await payos.ap2.getAnalytics('30d');

console.log(`Total revenue: ${analytics.summary.totalRevenue} USD`);
console.log(`Active mandates: ${analytics.summary.activeMandates}`);
console.log(`Utilization rate: ${analytics.summary.utilizationRate}%`);
```

## API Integration

The AP2Client wraps existing API endpoints:
- `POST /v1/ap2/mandates` - Create mandate
- `GET /v1/ap2/mandates` - List mandates
- `GET /v1/ap2/mandates/:id` - Get mandate
- `POST /v1/ap2/mandates/:id/execute` - Execute payment
- `PATCH /v1/ap2/mandates/:id/cancel` - Cancel mandate
- `GET /v1/ap2/analytics` - Get analytics

## Files Created/Modified

### Created
- `packages/sdk/src/protocols/ap2/types.ts` - Type definitions
- `packages/sdk/src/protocols/ap2/client.ts` - AP2 client implementation
- `packages/sdk/src/protocols/ap2/client.test.ts` - Client tests

### Modified
- `packages/sdk/src/protocols/ap2/index.ts` - Exports
- `packages/sdk/src/index.ts` - Added `ap2` to PayOS class
- `packages/sdk/src/client.ts` - Made `request` method public
- `packages/sdk/src/exports.test.ts` - Updated tests

## Key Features

### 1. Mandate Types
- **Intent**: Open-ended authorization for the agent to make payments
- **Cart**: Authorization for specific cart items
- **Payment**: Fixed amount authorization

### 2. Execution Tracking
- `execution_count` - Number of times mandate has been executed
- `execution_index` - Unique index for each execution
- Execution history with status and transfer IDs

### 3. Balance Management
- `authorized_amount` - Total authorized
- `used_amount` - Amount already spent
- `remaining_amount` - Available balance
- Automatic updates after each execution

### 4. Status Management
- `active` - Can be executed
- `completed` - Fully utilized
- `cancelled` - Manually cancelled
- `expired` - Past expiration date

## Use Cases

### AI Agent Subscriptions
```typescript
// User authorizes AI agent to pay for monthly services
const mandate = await payos.ap2.createMandate({
  mandate_type: 'payment',
  authorized_amount: 120.00, // $10/month for 12 months
  agent_id: 'my_ai_assistant',
  account_id: user.accountId,
});

// Agent automatically pays each month
await payos.ap2.executeMandate(mandate.id, {
  amount: 10.00,
  description: 'Monthly service payment',
});
```

### Shopping Cart Authorization
```typescript
// User authorizes AI to purchase specific items
const mandate = await payos.ap2.createMandate({
  mandate_type: 'cart',
  authorized_amount: 250.00,
  agent_id: 'shopping_agent',
  account_id: user.accountId,
  mandate_data: {
    items: ['laptop_stand', 'webcam', 'microphone'],
  },
});
```

## Next Steps

Story 36.6: Implement ACP (Agentic Commerce Protocol) for checkout-based payments

