# ACP E-commerce Example

This example demonstrates how to use Stripe/OpenAI's **Agentic Commerce Protocol (ACP)** for AI-powered shopping cart checkout and e-commerce transactions.

## What is ACP?

ACP enables AI agents to:
- Create shopping cart checkouts with multiple items
- Calculate totals with tax, shipping, and discounts
- Process payments with shared payment tokens
- Complete multi-item purchases
- Manage checkout lifecycle

Perfect for:
- 🛒 Shopping cart checkouts
- 🤖 AI shopping assistants
- 💰 Multi-item purchases
- 📦 E-commerce transactions

---

## Features

✅ Create multi-item checkouts  
✅ Automatic total calculation (subtotal + tax + shipping - discount)  
✅ Shared payment token support  
✅ Checkout completion with transfer creation  
✅ Checkout cancellation  
✅ E-commerce analytics  

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

// 1. Create checkout with shopping cart items
const checkout = await payos.acp.createCheckout({
  checkout_id: 'order_2026_001',
  agent_id: 'shopping_agent_xyz',
  account_id: 'buyer_account_456',
  merchant_id: 'merchant_api_store',
  merchant_name: 'API Credits Store',
  items: [
    {
      name: 'API Credits - Starter Pack',
      description: '1000 API calls',
      quantity: 2,
      unit_price: 45,
      total_price: 90,
      currency: 'USD',
    },
    {
      name: 'Premium Support',
      description: '1 month premium support',
      quantity: 1,
      unit_price: 20,
      total_price: 20,
      currency: 'USD',
    },
  ],
  tax_amount: 5.50,
  shipping_amount: 0,
  discount_amount: 10,  // Promo code applied
  currency: 'USD',
});

console.log(`Checkout created: ${checkout.id}`);
console.log(`Subtotal: $${checkout.subtotal}`);
console.log(`Tax: $${checkout.tax_amount}`);
console.log(`Discount: -$${checkout.discount_amount}`);
console.log(`Total: $${checkout.total_amount}`);

// 2. Complete checkout with payment
const completed = await payos.acp.completeCheckout(checkout.id, {
  shared_payment_token: 'spt_abc123xyz',
  payment_method: 'card_visa_1234',
  idempotency_key: 'checkout_complete_001',
});

console.log(`Payment completed!`);
console.log(`Transfer ID: ${completed.transfer_id}`);
console.log(`Status: ${completed.status}`);
```

---

## Use Cases

### 1. AI Shopping Assistant

```typescript
// Agent helps user build shopping cart
const cart = [
  { name: 'Laptop', price: 999, quantity: 1 },
  { name: 'Mouse', price: 29, quantity: 2 },
  { name: 'Keyboard', price: 79, quantity: 1 },
];

const checkout = await payos.acp.createCheckout({
  checkout_id: `cart_${Date.now()}`,
  agent_id: 'shopping_agent',
  account_id: 'user_123',
  merchant_id: 'electronics_store',
  items: cart.map(item => ({
    name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
  })),
  tax_amount: calculateTax(cart),
  shipping_amount: 15,
  currency: 'USD',
});
```

### 2. Subscription Checkout

```typescript
// User upgrades to annual plan with multiple features
const subscription = await payos.acp.createCheckout({
  checkout_id: 'subscription_annual_2026',
  agent_id: 'billing_agent',
  account_id: 'user_456',
  merchant_id: 'saas_company',
  items: [
    {
      name: 'Pro Plan - Annual',
      quantity: 1,
      unit_price: 480,
      total_price: 480,
    },
    {
      name: 'Extra Storage (100GB)',
      quantity: 1,
      unit_price: 120,
      total_price: 120,
    },
  ],
  discount_amount: 60, // 10% annual discount
  tax_amount: 30,
});
```

### 3. Multi-Vendor Marketplace

```typescript
// Agent completes purchases from multiple vendors
const marketplaceCheckout = await payos.acp.createCheckout({
  checkout_id: 'marketplace_order_789',
  agent_id: 'marketplace_agent',
  account_id: 'buyer_789',
  merchant_id: 'marketplace_platform',
  items: [
    {
      name: 'Product from Vendor A',
      quantity: 1,
      unit_price: 50,
      total_price: 50,
      metadata: { vendor_id: 'vendor_a', commission: 5 },
    },
    {
      name: 'Product from Vendor B',
      quantity: 2,
      unit_price: 30,
      total_price: 60,
      metadata: { vendor_id: 'vendor_b', commission: 6 },
    },
  ],
  tax_amount: 8.80,
  shipping_amount: 10,
});
```

---

## Error Handling

```typescript
try {
  await payos.acp.completeCheckout(checkout.id, {
    shared_payment_token: 'spt_invalid',
  });
} catch (error) {
  switch (error.code) {
    case 'INVALID_PAYMENT_TOKEN':
      console.log('Payment token is invalid or expired');
      // Request new token
      break;
    case 'CHECKOUT_EXPIRED':
      console.log('Checkout session has expired');
      // Create new checkout
      break;
    case 'INSUFFICIENT_FUNDS':
      console.log('Insufficient funds in account');
      // Prompt for alternative payment
      break;
    case 'CHECKOUT_ALREADY_COMPLETED':
      console.log('Checkout was already processed');
      // Show confirmation page
      break;
    default:
      console.error('Checkout failed:', error.message);
  }
}
```

---

## Monitoring & Analytics

```typescript
// Get e-commerce analytics
const analytics = await payos.acp.getAnalytics('7d');

console.log('Last 7 Days E-commerce:');
console.log(`├─ Revenue: $${analytics.summary.totalRevenue}`);
console.log(`├─ Orders: ${analytics.summary.completedCheckouts}`);
console.log(`├─ Avg Order: $${analytics.summary.averageOrderValue}`);
console.log(`├─ Merchants: ${analytics.summary.uniqueMerchants}`);
console.log(`└─ Agents: ${analytics.summary.uniqueAgents}`);

console.log('\nCheckout Status:');
console.log(`├─ Pending: ${analytics.checkoutsByStatus.pending}`);
console.log(`├─ Completed: ${analytics.checkoutsByStatus.completed}`);
console.log(`├─ Cancelled: ${analytics.checkoutsByStatus.cancelled}`);
console.log(`├─ Expired: ${analytics.checkoutsByStatus.expired}`);
console.log(`└─ Failed: ${analytics.checkoutsByStatus.failed}`);

// List user's recent checkouts
const userCheckouts = await payos.acp.listCheckouts({
  account_id: 'user_123',
  limit: 10,
});

console.log('\nRecent Checkouts:');
for (const checkout of userCheckouts.data) {
  console.log(`${checkout.checkout_id}: $${checkout.total_amount} - ${checkout.status}`);
}
```

---

## Best Practices

### 1. Calculate Totals Correctly
```typescript
const items = [/* cart items */];
const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
const tax = subtotal * 0.08; // 8% tax
const shipping = subtotal > 50 ? 0 : 10; // Free shipping over $50
const discount = hasPromoCode ? subtotal * 0.1 : 0; // 10% promo

const checkout = await payos.acp.createCheckout({
  items,
  tax_amount: tax,
  shipping_amount: shipping,
  discount_amount: discount,
  // PayOS will calculate and validate total_amount
});
```

### 2. Use Idempotency Keys
```typescript
// Prevent duplicate checkout completions
await payos.acp.completeCheckout(checkout.id, {
  shared_payment_token: 'spt_xyz',
  idempotency_key: `checkout_${checkout.id}_${userId}`,
});
```

### 3. Set Expiration Times
```typescript
// Checkout expires in 1 hour
const checkout = await payos.acp.createCheckout({
  // ...
  expires_at: new Date(Date.now() + 3600000).toISOString(),
});
```

### 4. Handle Cancellations
```typescript
// User abandons cart
if (userLeftSite) {
  await payos.acp.cancelCheckout(checkout.id);
}
```

---

## Testing

Run the test suite:

```bash
pnpm test
```

Tests cover:
- ✅ Checkout creation with items
- ✅ Total calculation
- ✅ Checkout completion
- ✅ Cancellation
- ✅ Expiration handling
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
- [ ] Implement proper tax calculation
- [ ] Set up shipping rate logic
- [ ] Handle payment webhooks
- [ ] Add retry logic for failures
- [ ] Implement inventory checks
- [ ] Set up fraud detection
- [ ] Add order confirmation emails

---

## Learn More

- 📖 [ACP Protocol Spec](https://developers.stripe.com/docs/agentic-commerce)
- 📖 [PayOS ACP Docs](https://docs.payos.ai/protocols/acp)
- 📖 [Checkout Lifecycle](https://docs.payos.ai/protocols/acp/lifecycle)
- 💬 [Discord Support](https://discord.gg/payos)

---

## Next Steps

1. Try the **ap2-subscription** example for recurring payments
2. Build a **nextjs-ai-payments** app with shopping cart UI
3. Integrate with your e-commerce platform

---

**Happy coding! 🛒**

