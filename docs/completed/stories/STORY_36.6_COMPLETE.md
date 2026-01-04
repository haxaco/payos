# Story 36.6: ACP Protocol Support - COMPLETE

**Status**: ✅ COMPLETE  
**Points**: 5  
**Completed**: January 3, 2026

## Summary

Implemented ACP (Stripe/OpenAI's Agentic Commerce Protocol) support in the SDK, enabling checkout-based payments where AI agents can manage shopping carts and complete transactions using SharedPaymentTokens.

## Implementation Details

### 1. ACPClient (`packages/sdk/src/protocols/acp/client.ts`)

**Key Methods:**
- `createCheckout(request)` - Create a new checkout session
- `listCheckouts(options)` - List checkouts with filtering
- `getCheckout(checkoutId)` - Get checkout details with items
- `completeCheckout(checkoutId, request)` - Complete checkout with SharedPaymentToken
- `cancelCheckout(checkoutId)` - Cancel a checkout
- `getAnalytics(period)` - Get ACP-specific analytics

### 2. Types (`packages/sdk/src/protocols/acp/types.ts`)

**Key Interfaces:**
- `CheckoutItem` - Individual cart item
- `Checkout` - Basic checkout information
- `CheckoutWithItems` - Checkout with full item details
- `CreateCheckoutRequest` - Create checkout parameters
- `CompleteCheckoutRequest` - Complete with SharedPaymentToken
- `CompleteCheckoutResponse` - Completion result

### 3. Integration

Added to main `PayOS` class:
```typescript
const payos = new PayOS({ apiKey: '...', environment: 'sandbox' });
const checkout = await payos.acp.createCheckout({...});
```

## Testing

```bash
cd packages/sdk && pnpm test
# ✓ 7 ACPClient tests pass
# ✓ 111 total tests pass
```

Test coverage includes:
- Checkout creation with items
- Checkout listing and filtering
- Checkout retrieval
- Checkout completion with SPT
- Checkout cancellation
- Analytics retrieval

## Usage Examples

### Create a Checkout Session

```typescript
const payos = new PayOS({
  apiKey: 'payos_...',
  environment: 'sandbox',
});

// AI agent creates checkout for user
const checkout = await payos.acp.createCheckout({
  checkout_id: 'checkout_unique_123',
  agent_id: 'agent_shopping_assistant',
  account_id: 'acct_uuid',
  merchant_id: 'merchant_store',
  merchant_name: 'Example Store',
  customer_email: 'user@example.com',
  items: [
    {
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      quantity: 1,
      unit_price: 29.99,
      total_price: 29.99,
    },
    {
      name: 'USB-C Cable',
      quantity: 2,
      unit_price: 9.99,
      total_price: 19.98,
    },
  ],
  tax_amount: 4.50,
  shipping_amount: 5.99,
  currency: 'USD',
});

console.log(`Checkout created: ${checkout.checkout_id}`);
console.log(`Total: ${checkout.total_amount} ${checkout.currency}`);
```

### Complete Checkout

```typescript
// User provides SharedPaymentToken from Stripe/OpenAI
const result = await payos.acp.completeCheckout('checkout_unique_123', {
  shared_payment_token: 'spt_1234567890abcdef',
  payment_method: 'card',
});

console.log(`Payment completed!`);
console.log(`Transfer ID: ${result.transfer_id}`);
console.log(`Status: ${result.status}`);
```

### List Checkouts

```typescript
const { data, pagination } = await payos.acp.listCheckouts({
  status: 'pending',
  agent_id: 'agent_shopping_assistant',
  limit: 20,
});

console.log(`Found ${data.length} pending checkouts`);
data.forEach(co => {
  console.log(`- ${co.checkout_id}: ${co.total_amount} ${co.currency} (${co.merchant_name})`);
});
```

### Get Checkout Details

```typescript
const checkout = await payos.acp.getCheckout('checkout_unique_123');

console.log(`Checkout: ${checkout.checkout_id}`);
console.log(`Merchant: ${checkout.merchant_name}`);
console.log(`Customer: ${checkout.customer_email}`);
console.log(`\nCart:`);
checkout.items.forEach(item => {
  console.log(`  - ${item.name} x${item.quantity}: ${item.total_price} ${item.currency}`);
});
console.log(`\nSubtotal: ${checkout.subtotal}`);
console.log(`Tax: ${checkout.tax_amount}`);
console.log(`Shipping: ${checkout.shipping_amount}`);
console.log(`Total: ${checkout.total_amount} ${checkout.currency}`);
```

### Cancel Checkout

```typescript
const result = await payos.acp.cancelCheckout('checkout_unique_123');
console.log(`Checkout cancelled at ${result.cancelled_at}`);
```

### Get Analytics

```typescript
const analytics = await payos.acp.getAnalytics('30d');

console.log(`Total revenue: ${analytics.summary.totalRevenue} USD`);
console.log(`Completed checkouts: ${analytics.summary.completedCheckouts}`);
console.log(`Average order value: ${analytics.summary.averageOrderValue} USD`);
console.log(`Unique merchants: ${analytics.summary.uniqueMerchants}`);
```

## API Integration

The ACPClient wraps existing API endpoints:
- `POST /v1/acp/checkouts` - Create checkout
- `GET /v1/acp/checkouts` - List checkouts
- `GET /v1/acp/checkouts/:id` - Get checkout
- `POST /v1/acp/checkouts/:id/complete` - Complete checkout
- `PATCH /v1/acp/checkouts/:id/cancel` - Cancel checkout
- `GET /v1/acp/analytics` - Get analytics

## Files Created/Modified

### Created
- `packages/sdk/src/protocols/acp/types.ts` - Type definitions
- `packages/sdk/src/protocols/acp/client.ts` - ACP client implementation
- `packages/sdk/src/protocols/acp/client.test.ts` - Client tests

### Modified
- `packages/sdk/src/protocols/acp/index.ts` - Exports
- `packages/sdk/src/index.ts` - Added `acp` to PayOS class
- `packages/sdk/src/exports.test.ts` - Updated tests

## Key Features

### 1. Shopping Cart Management
- Multiple items per checkout
- Quantity tracking
- Individual item pricing
- Item metadata support

### 2. Pricing Components
- `subtotal` - Sum of all items
- `tax_amount` - Sales tax
- `shipping_amount` - Shipping/delivery
- `discount_amount` - Applied discounts
- `total_amount` - Final total

### 3. SharedPaymentToken Support
- Integration with Stripe's SPT
- Seamless payment completion
- No direct card handling needed

### 4. Status Management
- `pending` - Awaiting completion
- `completed` - Payment successful
- `cancelled` - User/merchant cancelled
- `expired` - Session timed out
- `failed` - Payment failed

## Use Cases

### AI Shopping Assistant
```typescript
// Agent helps user shop and creates checkout
const checkout = await payos.acp.createCheckout({
  checkout_id: crypto.randomUUID(),
  agent_id: 'shopping_assistant',
  account_id: user.accountId,
  merchant_id: 'electronics_store',
  merchant_name: 'Tech Haven',
  customer_email: user.email,
  items: [
    { name: 'Laptop', quantity: 1, unit_price: 999.99, total_price: 999.99 },
    { name: 'Mouse', quantity: 1, unit_price: 29.99, total_price: 29.99 },
  ],
  tax_amount: 92.90,
  shipping_amount: 15.00,
});

// User approves with SharedPaymentToken
await payos.acp.completeCheckout(checkout.id, {
  shared_payment_token: userSPT,
});
```

### Multi-Merchant Order
```typescript
// Agent can create separate checkouts for different merchants
const checkout1 = await payos.acp.createCheckout({
  merchant_id: 'electronics_store',
  items: [/* electronics */],
  // ...
});

const checkout2 = await payos.acp.createCheckout({
  merchant_id: 'clothing_store',
  items: [/* clothing */],
  // ...
});
```

## SharedPaymentToken (SPT)

ACP uses Stripe/OpenAI's SharedPaymentToken standard:
1. User authorizes payment method once
2. Receives SPT from Stripe/OpenAI
3. Agent creates checkout
4. User confirms with SPT
5. Payment completes without re-entering card details

## Security

- SharedPaymentTokens are single-use
- Checkouts can expire
- User must explicitly confirm each checkout
- No raw payment details in SDK

## Next Steps

With AP2 and ACP complete, all major protocols are now supported:
- ✅ x402 (Coinbase/Cloudflare micropayments)
- ✅ AP2 (Google mandate-based payments)
- ✅ ACP (Stripe/OpenAI checkout payments)

