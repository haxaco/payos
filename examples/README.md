# PayOS SDK Examples

This directory contains complete, runnable examples demonstrating how to use the `@sly/sdk` unified SDK for various payment scenarios.

## Examples Overview

### 1. **x402-micropayments/** - HTTP 402 Micropayments
Demonstrates automatic micropayments using the x402 protocol for content access.

**Use Cases:**
- Pay-per-API-call
- Metered content access
- Microtransactions

### 2. **ap2-subscription/** - AP2 Mandate-Based Subscriptions
Shows how to use Google's Agent-to-Agent Protocol for recurring payments.

**Use Cases:**
- Monthly subscriptions
- Usage-based billing
- AI agent spending limits

### 3. **acp-ecommerce/** - ACP E-commerce Checkout
Demonstrates Stripe/OpenAI's Agentic Commerce Protocol for shopping cart checkout.

**Use Cases:**
- E-commerce purchases
- Multi-item checkouts
- Shopping cart management

### 4. **nextjs-ai-payments/** - Next.js + Vercel AI SDK
Full-stack Next.js app with AI-powered payment assistant.

**Use Cases:**
- Conversational payments
- AI shopping assistants
- Natural language transactions

### 5. **langchain-agent/** - LangChain Agent with Payments
AI agent using LangChain that can execute payments autonomously.

**Use Cases:**
- Autonomous payment agents
- Multi-step workflows
- Complex decision-making

### 6. **multi-protocol-router/** - Settlement Protocol Router
Intelligent router that selects the best protocol based on payment characteristics.

**Use Cases:**
- Protocol optimization
- Cost minimization
- Latency optimization

---

## Quick Start

Each example includes:
- ✅ Complete source code
- ✅ README with setup instructions
- ✅ Environment variable templates
- ✅ TypeScript examples
- ✅ Test scenarios

### Prerequisites

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your PayOS API key
```

### Run an Example

```bash
cd examples/[example-name]
pnpm install
pnpm dev
```

---

## Example Comparison

| Example | Protocol | Complexity | Best For |
|---------|----------|------------|----------|
| x402-micropayments | x402 | Low | Pay-per-use APIs |
| ap2-subscription | AP2 | Medium | Recurring billing |
| acp-ecommerce | ACP | Medium | Shopping carts |
| nextjs-ai-payments | Multi | High | Full-stack apps |
| langchain-agent | Multi | High | AI automation |
| multi-protocol-router | Multi | Medium | Protocol selection |

---

## Environment Setup

All examples require a PayOS API key:

```bash
# Get your API key from https://payos.ai/dashboard
PAYOS_API_KEY=payos_sandbox_xxxxx
PAYOS_ENVIRONMENT=sandbox  # or testnet, production
```

For testnet/production (requires EVM key):
```bash
PAYOS_EVM_PRIVATE_KEY=0xxxxx
```

---

## Learning Path

### Beginners
1. Start with **x402-micropayments** - simplest example
2. Try **ap2-subscription** - learn mandate management
3. Explore **acp-ecommerce** - understand checkout flows

### Intermediate
4. Build **nextjs-ai-payments** - full-stack integration
5. Study **multi-protocol-router** - protocol selection

### Advanced
6. Implement **langchain-agent** - autonomous AI payments
7. Customize examples for your use case

---

## Common Patterns

### Pattern 1: Initialize SDK
```typescript
import { PayOS } from '@sly/sdk';

const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY!,
  environment: 'sandbox',
});
```

### Pattern 2: Handle Errors
```typescript
try {
  const settlement = await payos.createSettlement({...});
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    // Handle specific error
  }
  throw error;
}
```

### Pattern 3: Use Callbacks
```typescript
const x402Client = payos.x402.createClient({
  onPayment: (payment) => {
    console.log('Payment made:', payment);
  },
  onSettlement: (settlement) => {
    console.log('Settled:', settlement);
  },
});
```

---

## Testing

Each example includes tests:

```bash
cd examples/[example-name]
pnpm test
```

---

## Support

- 📖 **Documentation**: https://docs.payos.ai
- 💬 **Discord**: https://discord.gg/payos
- 🐛 **Issues**: https://github.com/payos/payos-sdk/issues
- 📧 **Email**: support@payos.ai

---

## Contributing

Want to add an example? Submit a PR with:
1. Complete, runnable code
2. README with setup instructions
3. Tests
4. .env.example template

---

## License

All examples are MIT licensed. Use them freely in your projects!

