# AP2 Subscription Example

This example demonstrates how to use Google's **Agent-to-Agent Protocol (AP2)** for mandate-based recurring payments and subscriptions.

## What is AP2?

AP2 allows AI agents to:
- Create payment mandates with authorized spending limits
- Execute multiple payments against a single mandate
- Track cumulative usage and remaining balance
- Cancel mandates when needed

Perfect for:
- 🔄 Monthly subscriptions
- 📊 Usage-based billing
- 🤖 AI agent spending limits
- 💳 Pre-authorized payments

---

## Features

✅ Create subscription mandates  
✅ Execute recurring payments  
✅ Track usage and limits  
✅ Handle authorization failures  
✅ Cancel subscriptions  
✅ View analytics  

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your PayOS API key
```

### 3. Run the Example

```bash
pnpm dev
```

---

## Code Example

```typescript
import { PayOS } from '@payos/sdk';

const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'sandbox',
});

// 1. Create a $50 monthly AI subscription mandate
const mandate = await payos.ap2.createMandate({
  mandate_id: 'subscription_ai_monthly',
  mandate_type: 'payment',
  agent_id: 'ai_service_agent',
  account_id: 'user_account_123',
  authorized_amount: 50,
  currency: 'USD',
  metadata: {
    subscription_plan: 'pro',
    billing_cycle: 'monthly',
  },
});

console.log(`Mandate created: ${mandate.id}`);
console.log(`Authorized: $${mandate.authorized_amount}`);
console.log(`Status: ${mandate.status}`);

// 2. Charge $10 for January usage
const january = await payos.ap2.executeMandate(mandate.id, {
  amount: 10,
  currency: 'USD',
  description: 'January AI credits',
  idempotency_key: 'charge_jan_2026',
});

console.log(`January charge: $${january.transfer.amount}`);
console.log(`Remaining: $${january.mandate.remaining_amount}`);

// 3. Check mandate status
const status = await payos.ap2.getMandate(mandate.id);
console.log(`Used: $${status.used_amount}`);
console.log(`Remaining: $${status.remaining_amount}`);
console.log(`Executions: ${status.execution_count}`);
console.log(`History:`, status.executions);

// 4. Get subscription analytics
const analytics = await payos.ap2.getAnalytics('30d');
console.log(`Active mandates: ${analytics.summary.activeMandates}`);
console.log(`Utilization: ${analytics.summary.utilizationRate}%`);
console.log(`Total authorized: $${analytics.summary.totalAuthorized}`);
```

---

## Use Cases

### 1. Monthly AI Service Subscription

```typescript
// User subscribes to $50/month AI service
const aiSubscription = await payos.ap2.createMandate({
  mandate_id: 'ai_pro_monthly',
  mandate_type: 'payment',
  agent_id: 'ai_service',
  account_id: 'user_123',
  authorized_amount: 50,
  currency: 'USD',
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

// Charge usage throughout the month
await payos.ap2.executeMandate(aiSubscription.id, {
  amount: 5,
  description: 'Week 1 API calls',
});
await payos.ap2.executeMandate(aiSubscription.id, {
  amount: 8,
  description: 'Week 2 API calls',
});
```

### 2. Usage-Based Billing

```typescript
// Agent has $100 budget for autonomous operations
const agentBudget = await payos.ap2.createMandate({
  mandate_id: 'agent_budget_monthly',
  mandate_type: 'payment',
  agent_id: 'shopping_agent',
  account_id: 'company_account',
  authorized_amount: 100,
  currency: 'USD',
});

// Agent makes purchases as needed
async function makeAutonomousPurchase(amount: number, description: string) {
  try {
    return await payos.ap2.executeMandate(agentBudget.id, {
      amount,
      description,
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_MANDATE_AMOUNT') {
      console.log('Budget exceeded! Need approval for more spending.');
    }
    throw error;
  }
}
```

### 3. Shopping Cart Mandate

```typescript
// User authorizes agent to complete a purchase up to $200
const cartMandate = await payos.ap2.createMandate({
  mandate_id: 'cart_checkout_xyz',
  mandate_type: 'cart',
  agent_id: 'shopping_agent',
  account_id: 'user_456',
  authorized_amount: 200,
  currency: 'USD',
  expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
});

// Agent negotiates with sellers and executes when ready
const purchase = await payos.ap2.executeMandate(cartMandate.id, {
  amount: 185,
  description: 'Complete cart checkout - 3 items',
});
```

---

## Error Handling

```typescript
try {
  await payos.ap2.executeMandate(mandate.id, {
    amount: 100, // Exceeds remaining amount
  });
} catch (error) {
  switch (error.code) {
    case 'INSUFFICIENT_MANDATE_AMOUNT':
      console.log('Amount exceeds remaining authorization');
      // Ask user to increase mandate limit
      break;
    case 'MANDATE_EXPIRED':
      console.log('Mandate has expired');
      // Create new mandate
      break;
    case 'MANDATE_CANCELLED':
      console.log('Mandate was cancelled');
      // User cancelled subscription
      break;
    default:
      console.error('Execution failed:', error.message);
  }
}
```

---

## Monitoring & Analytics

```typescript
// Get real-time analytics
const analytics = await payos.ap2.getAnalytics('7d');

console.log('Last 7 Days:');
console.log(`├─ Revenue: $${analytics.summary.totalRevenue}`);
console.log(`├─ Active Mandates: ${analytics.summary.activeMandates}`);
console.log(`├─ Utilization Rate: ${analytics.summary.utilizationRate}%`);
console.log(`└─ Transactions: ${analytics.summary.transactionCount}`);

console.log('\nMandate Status:');
console.log(`├─ Active: ${analytics.mandatesByStatus.active}`);
console.log(`├─ Completed: ${analytics.mandatesByStatus.completed}`);
console.log(`├─ Cancelled: ${analytics.mandatesByStatus.cancelled}`);
console.log(`└─ Expired: ${analytics.mandatesByStatus.expired}`);
```

---

## Best Practices

### 1. Set Appropriate Limits
```typescript
// Don't authorize more than needed
const mandate = await payos.ap2.createMandate({
  authorized_amount: 50, // Reasonable monthly limit
  expires_at: nextMonth(), // Expire after billing cycle
});
```

### 2. Use Idempotency Keys
```typescript
// Prevent duplicate charges
await payos.ap2.executeMandate(mandate.id, {
  amount: 10,
  idempotency_key: `charge_${userId}_${Date.now()}`,
});
```

### 3. Track Execution History
```typescript
// Regularly check mandate status
const status = await payos.ap2.getMandate(mandate.id);
for (const execution of status.executions) {
  console.log(`${execution.created_at}: $${execution.amount} - ${execution.status}`);
}
```

### 4. Handle Mandate Lifecycle
```typescript
// Cancel when subscription ends
if (userCancelled) {
  await payos.ap2.cancelMandate(mandate.id);
}

// Renew for next period
if (shouldRenew) {
  await payos.ap2.createMandate({
    mandate_id: `${oldMandateId}_renewed`,
    authorized_amount: 50,
    // ...
  });
}
```

---

## Testing

Run the test suite:

```bash
pnpm test
```

Tests cover:
- ✅ Mandate creation
- ✅ Execution within limits
- ✅ Exceeding authorization
- ✅ Multiple executions
- ✅ Cancellation
- ✅ Analytics

---

## Environment Variables

Create a `.env` file:

```bash
# Required
PAYOS_API_KEY=payos_sandbox_xxxxx
PAYOS_ENVIRONMENT=sandbox

# Optional
PAYOS_API_URL=http://localhost:4000  # Custom API URL
```

---

## Production Checklist

Before going live:

- [ ] Switch to `production` environment
- [ ] Use real PayOS API key
- [ ] Set up webhook handlers
- [ ] Implement retry logic
- [ ] Add logging/monitoring
- [ ] Test mandate expiration
- [ ] Handle edge cases
- [ ] Set up alerts for failures

---

## Learn More

- 📖 [AP2 Protocol Spec](https://developers.google.com/agent-to-agent-protocol)
- 📖 [PayOS AP2 Docs](https://docs.payos.ai/protocols/ap2)
- 📖 [Mandate Types](https://docs.payos.ai/protocols/ap2/mandate-types)
- 💬 [Discord Support](https://discord.gg/payos)

---

## Next Steps

1. Try the **acp-ecommerce** example for shopping cart checkout
2. Build a **nextjs-ai-payments** app with conversational subscriptions
3. Integrate with your existing billing system

---

**Happy coding! 🚀**

