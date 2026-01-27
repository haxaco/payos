# Migration Guide: Old SDKs → @sly/sdk

**Last Updated**: January 3, 2026  
**Status**: Old SDKs deprecated, please migrate to `@sly/sdk`

---

## 🚨 Deprecation Notice

The following packages are **deprecated** and will no longer receive updates:

- ❌ `@sly/x402-client-sdk` → Use `@sly/sdk` with `payos.x402.createClient()`
- ❌ `@sly/x402-provider-sdk` → Use `@sly/sdk` with `payos.x402.createProvider()`
- ❌ `@sly/api-client` → Use `@sly/sdk` directly

**Please migrate to `@sly/sdk` for:**
- ✅ Unified API for all protocols
- ✅ Better TypeScript support
- ✅ AI agent integrations (OpenAI, Claude, LangChain, Vercel)
- ✅ Active maintenance and updates
- ✅ Improved documentation
- ✅ Sandbox mode for testing

---

## Migration Timeline

| Date | Action |
|------|--------|
| **Jan 3, 2026** | Old SDKs officially deprecated |
| **Feb 1, 2026** | Security updates only for old SDKs |
| **Apr 1, 2026** | Old SDKs become unmaintained |
| **Jul 1, 2026** | Old SDK packages removed from npm |

**Action Required**: Migrate before April 1, 2026

---

## Quick Migration

### Install New SDK

```bash
# Remove old packages
pnpm remove @sly/x402-client-sdk @sly/x402-provider-sdk @sly/api-client

# Install new unified SDK
pnpm add @sly/sdk
```

### Update Imports

```typescript
// ❌ Old
import { X402Client } from '@sly/x402-client-sdk';
import { X402Provider } from '@sly/x402-provider-sdk';
import { PayOSApiClient } from '@sly/api-client';

// ✅ New
import { PayOS } from '@sly/sdk';
```

---

## Migration by Package

### 1. x402-client-sdk → @sly/sdk

#### Old Code
```typescript
import { X402Client } from '@sly/x402-client-sdk';

const client = new X402Client({
  apiKey: process.env.PAYOS_API_KEY,
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});

const response = await client.fetch('https://api.example.com/protected');
```

#### New Code
```typescript
import { PayOS } from '@sly/sdk';

const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'production', // or 'sandbox', 'testnet'
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});

const x402Client = payos.x402.createClient();
const response = await x402Client.fetch('https://api.example.com/protected');
```

#### What Changed
- ✅ Unified initialization with `PayOS`
- ✅ Environment-based configuration
- ✅ Create x402 client from main instance
- ✅ Same `fetch()` API

#### Benefits
- ✅ Sandbox mode (no EVM key needed)
- ✅ Spending limits built-in
- ✅ Better error handling
- ✅ Callbacks for payments

---

### 2. x402-provider-sdk → @sly/sdk

#### Old Code
```typescript
import { X402Provider } from '@sly/x402-provider-sdk';
import express from 'express';

const app = express();
const provider = new X402Provider({
  routes: {
    '/api/protected': { price: '0.01' },
  },
});

app.use('/api', provider.middleware());
```

#### New Code
```typescript
import { PayOS } from '@sly/sdk';
import express from 'express';

const app = express();
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'production',
});

const provider = payos.x402.createProvider({
  'GET /api/protected': { 
    price: '0.01',
    description: 'Access protected resource',
  },
});

app.use('/api', provider.middleware());
```

#### What Changed
- ✅ Create provider from `payos.x402`
- ✅ Route format now includes HTTP method
- ✅ Optional descriptions for better UX
- ✅ Custom tokens per route

#### Benefits
- ✅ Sandbox facilitator for testing
- ✅ Better 402 response formatting
- ✅ Wildcard route support
- ✅ Debug mode

---

### 3. api-client → @sly/sdk

#### Old Code
```typescript
import { PayOSApiClient } from '@sly/api-client';

const client = new PayOSApiClient({
  apiKey: process.env.PAYOS_API_KEY,
  baseUrl: 'https://api.payos.ai',
});

const quote = await client.post('/settlements/quote', {
  amount: 100,
  fromCurrency: 'USD',
  toCurrency: 'BRL',
});

const settlement = await client.post('/settlements', {
  quoteId: quote.id,
  recipientId: 'acc_123',
});
```

#### New Code
```typescript
import { PayOS } from '@sly/sdk';

const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'production',
});

const quote = await payos.getSettlementQuote({
  amount: '100',
  fromCurrency: 'USD',
  toCurrency: 'BRL',
});

const settlement = await payos.createSettlement({
  quoteId: quote.id,
  destinationAccountId: 'acc_123',
});
```

#### What Changed
- ✅ Type-safe methods instead of raw paths
- ✅ Better parameter names (`destinationAccountId` vs `recipientId`)
- ✅ Automatic URL construction
- ✅ Improved error types

#### Benefits
- ✅ IntelliSense autocomplete
- ✅ Type checking at compile time
- ✅ Consistent error handling
- ✅ Built-in retry logic

---

## New Features Available

### 1. Multi-Protocol Support

```typescript
// AP2 - Mandate-based subscriptions
const mandate = await payos.ap2.createMandate({
  mandate_id: 'subscription_monthly',
  authorized_amount: 50,
  // ...
});

await payos.ap2.executeMandate(mandate.id, {
  amount: 10,
});

// ACP - E-commerce checkout
const checkout = await payos.acp.createCheckout({
  checkout_id: 'order_123',
  items: [
    { name: 'Product', quantity: 1, unit_price: 100 },
  ],
  // ...
});

await payos.acp.completeCheckout(checkout.id, {
  shared_payment_token: 'spt_xyz',
});
```

### 2. AI Agent Integrations

```typescript
// OpenAI Function Calling
const openaiTools = await payos.capabilities.toOpenAIFunctions();

// Claude Tool Use
const claudeTools = await payos.capabilities.toClaudeTools();

// LangChain
const langchainTools = await payos.langchain.getTools();

// Vercel AI SDK
import { createPayOSVercelTools } from '@sly/sdk/vercel';
const vercelTools = createPayOSVercelTools(payos);
```

### 3. Sandbox Mode

```typescript
// No EVM key needed for development!
const payos = new PayOS({
  apiKey: 'payos_sandbox_test',
  environment: 'sandbox',
});

const x402Client = payos.x402.createClient();
// Mock facilitator automatically used
```

### 4. Capabilities Discovery

```typescript
// Discover available operations
const capabilities = await payos.capabilities.getAll();

// Filter by category
const paymentOps = await payos.capabilities.filter({
  category: 'payments',
});

// Get specific capability
const createSettlement = await payos.capabilities.get('create_settlement');
```

---

## Breaking Changes

### 1. Configuration Structure

**Old:**
```typescript
{
  apiKey: string;
  evmPrivateKey: string;
}
```

**New:**
```typescript
{
  apiKey: string;
  environment: 'sandbox' | 'testnet' | 'production';
  evmPrivateKey?: string; // Optional in sandbox
}
```

### 2. Error Format

**Old:**
```typescript
catch (error) {
  console.log(error.statusCode); // 400
  console.log(error.message); // Error message
}
```

**New:**
```typescript
catch (error) {
  console.log(error.code); // 'INSUFFICIENT_FUNDS'
  console.log(error.message); // Human-readable message
  console.log(error.suggestedAction); // What to do next
}
```

### 3. Response Format

All responses now follow structured format:

```typescript
{
  data: T,              // Your result
  success: true,
  timestamp: string,
}
```

Or for errors:

```typescript
{
  error: {
    code: string,
    message: string,
    suggestedAction: string,
  },
  success: false,
  timestamp: string,
}
```

---

## Step-by-Step Migration

### Step 1: Install New SDK

```bash
pnpm add @sly/sdk
```

### Step 2: Update Imports (Don't Remove Old Yet)

```typescript
// Keep old import temporarily
import { X402Client as OldClient } from '@sly/x402-client-sdk';

// Add new import
import { PayOS } from '@sly/sdk';
```

### Step 3: Initialize New SDK

```typescript
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});
```

### Step 4: Migrate One Feature at a Time

```typescript
// Old code still working
const oldClient = new OldClient({...});
const oldResult = await oldClient.fetch('...');

// New code side-by-side
const newClient = payos.x402.createClient();
const newResult = await newClient.fetch('...');

// Verify results match
assert.deepEqual(oldResult, newResult);
```

### Step 5: Update Tests

```typescript
// Old test
it('should fetch protected resource', async () => {
  const client = new X402Client({...});
  const result = await client.fetch('...');
  expect(result.status).toBe(200);
});

// New test
it('should fetch protected resource', async () => {
  const payos = new PayOS({...});
  const client = payos.x402.createClient();
  const result = await client.fetch('...');
  expect(result.status).toBe(200);
});
```

### Step 6: Remove Old Packages

```bash
pnpm remove @sly/x402-client-sdk @sly/x402-provider-sdk @sly/api-client
```

### Step 7: Clean Up Imports

```typescript
// Remove old imports
-import { X402Client } from '@sly/x402-client-sdk';

// Keep only new
import { PayOS } from '@sly/sdk';
```

---

## Common Migration Issues

### Issue 1: "evmPrivateKey is required"

**Problem**: Old SDK allowed missing EVM key, new SDK requires it for testnet/production.

**Solution**: Use sandbox mode for development:
```typescript
const payos = new PayOS({
  apiKey: '...',
  environment: 'sandbox', // No EVM key needed!
});
```

### Issue 2: "Module not found: @sly/x402-client-sdk"

**Problem**: Trying to import old package.

**Solution**: Update imports to use new SDK:
```typescript
import { PayOS } from '@sly/sdk';
```

### Issue 3: "TypeError: client.fetch is not a function"

**Problem**: Calling methods on wrong object.

**Solution**: Create x402 client first:
```typescript
const payos = new PayOS({...});
const client = payos.x402.createClient(); // Don't forget this!
await client.fetch('...');
```

### Issue 4: Response structure changed

**Problem**: Code expects `response.data` but gets different structure.

**Solution**: Update response handling:
```typescript
// Old
const { data } = await client.getSettlement('id');

// New - same!
const { data } = await payos.getSettlement('id');
```

---

## Testing Your Migration

### 1. Run Existing Tests

```bash
pnpm test
```

All tests should still pass.

### 2. Test in Sandbox

```typescript
const payos = new PayOS({
  apiKey: 'payos_sandbox_test',
  environment: 'sandbox',
});

// Test all your operations
await payos.getSettlementQuote({...});
await payos.createSettlement({...});
```

### 3. Test in Testnet

```typescript
const payos = new PayOS({
  apiKey: process.env.PAYOS_TESTNET_KEY!,
  environment: 'testnet',
  evmPrivateKey: process.env.TESTNET_EVM_KEY!,
});

// Small transactions only!
```

### 4. Deploy to Production

```typescript
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'production',
  evmPrivateKey: process.env.EVM_PRIVATE_KEY!,
});
```

---

## Need Help?

### Resources
- 📖 [New SDK Documentation](https://docs.payos.ai/sdk)
- 📖 [API Reference](https://docs.payos.ai/api)
- 💬 [Discord Community](https://discord.gg/payos)
- 📧 [Email Support](mailto:support@payos.ai)

### Migration Support
- 🎫 [Open a Support Ticket](https://payos.ai/support)
- 💬 [Ask in Discord #migrations](https://discord.gg/payos)
- 📖 [View Migration Examples](https://github.com/payos/migration-examples)

### Professional Services
Need help migrating large codebases? We offer:
- Migration consulting
- Code review
- Pair programming sessions
- Custom training

Contact: enterprise@payos.ai

---

## Checklist

Use this checklist to track your migration:

- [ ] Install `@sly/sdk`
- [ ] Update environment configuration
- [ ] Migrate x402 client code
- [ ] Migrate x402 provider code
- [ ] Migrate direct API calls
- [ ] Update error handling
- [ ] Update tests
- [ ] Test in sandbox
- [ ] Test in testnet
- [ ] Remove old packages
- [ ] Clean up imports
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Update documentation

---

## Migration Complete? 🎉

Congratulations! You're now using the unified `@sly/sdk` with:

✅ Better type safety  
✅ Multi-protocol support (x402, AP2, ACP)  
✅ AI agent integrations  
✅ Improved developer experience  
✅ Active maintenance & updates  

**Welcome to the new PayOS SDK!** 🚀

