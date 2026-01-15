# Story: Agentic Payments Developers Page

**Story ID:** UI-AGENTIC-DEVELOPERS  
**Priority:** P2  
**Assignee:** Gemini (Frontend)  
**Status:** Todo  
**Epic:** Agentic Payments UI

---

## User Story

**As a** PayOS developer  
**I want to** access comprehensive developer documentation and tools for agentic payments  
**So that** I can integrate x402, AP2, and ACP protocols into my applications

---

## Background

The Developers page serves as a centralized hub for:
- **API Documentation:** x402, AP2, ACP protocol guides
- **SDK Downloads:** Client and provider SDKs
- **Code Examples:** Integration snippets and templates
- **API Keys:** Management and generation
- **Webhooks:** Configuration and testing
- **Developer Tools:** Sandbox, API explorer, debugging tools

This page is essential for developers building:
- AI agents that make payments (x402 consumers)
- APIs that accept payments (x402 providers)
- Agent-authorized payment systems (AP2)
- Shopping integrations (ACP)

---

## Acceptance Criteria

### Must Have (P0)

1. **Route & Navigation**
   - [ ] Page accessible at `/dashboard/agentic-payments/developers`
   - [ ] Listed in Agentic Payments navigation menu
   - [ ] Breadcrumb: Dashboard > Agentic Payments > Developers

2. **Page Header**
   - [ ] Title: "Developer Resources"
   - [ ] Subtitle: "Integrate agentic payments into your applications"
   - [ ] Quick links: Documentation, SDKs, API Reference, Examples

3. **Quick Start Section**
   - [ ] Choose your protocol cards:
     - x402 (HTTP 402 Payment Required)
     - AP2 (Agent Payment Protocol)
     - ACP (Agentic Commerce Protocol)
   - [ ] Each card shows:
     - Protocol icon and name
     - Brief description (1 sentence)
     - "Get Started" button → protocol-specific guide
     - Use case examples

4. **API Keys Section**
   - [ ] Display existing API keys (truncated)
   - [ ] "Create New API Key" button
   - [ ] Key type selection (Test/Live)
   - [ ] Copy key functionality
   - [ ] Revoke key action
   - [ ] Last used timestamp
   - [ ] Key permissions/scopes

5. **SDKs & Libraries**
   - [ ] Grid of available SDKs:
     - JavaScript/TypeScript (npm)
     - Python (pip)
     - Go (go get)
     - Java (maven)
   - [ ] Each SDK card shows:
     - Language/platform
     - Latest version
     - Installation command (copy button)
     - Link to GitHub repo
     - Link to docs
     - Download stats (optional)

6. **Code Examples**
   - [ ] Tabbed code viewer with examples:
     - x402 Provider Setup
     - x402 Consumer Integration
     - AP2 Mandate Creation
     - ACP Checkout Flow
   - [ ] Syntax highlighting
   - [ ] Copy code button
   - [ ] Language selector (JS, Python, Go, cURL)
   - [ ] Line numbers
   - [ ] Collapsible sections

7. **API Reference**
   - [ ] Link to full API documentation (OpenAPI/Swagger)
   - [ ] Quick reference table:
     - Endpoint
     - Method
     - Description
     - Rate limit
   - [ ] "Try it" buttons for each endpoint (opens API explorer)

### Should Have (P1)

8. **Webhooks Configuration**
   - [ ] List of configured webhooks
   - [ ] Add webhook endpoint
   - [ ] Test webhook delivery
   - [ ] View webhook delivery logs
   - [ ] Webhook signing secrets
   - [ ] Event types selector

9. **Developer Tools**
   - [ ] **API Explorer:** Interactive API testing tool
   - [ ] **Sandbox Mode:** Toggle test/live environment
   - [ ] **Request Inspector:** View recent API requests/responses
   - [ ] **Logs Viewer:** Real-time API logs
   - [ ] **Rate Limit Dashboard:** Current usage vs limits

10. **Integration Guides**
    - [ ] Step-by-step tutorials:
      - Building an x402-powered API
      - Creating an AP2 payment agent
      - Implementing ACP checkout
    - [ ] Video tutorials (if available)
    - [ ] Common pitfalls and solutions
    - [ ] Best practices

11. **Sample Projects**
    - [ ] Links to GitHub repositories:
      - x402 demo app
      - AP2 agent example
      - ACP shopping cart demo
    - [ ] "Deploy to Vercel/Railway" buttons
    - [ ] Live demos

### Could Have (P2)

12. **Advanced Features**
    - [ ] **Community Forum:** Link to discussions
    - [ ] **Changelog:** Recent API updates
    - [ ] **Status Page:** API uptime and incidents
    - [ ] **SDKGenerators:** Auto-generate client code
    - [ ] **Postman Collection:** Download button
    - [ ] **OpenAPI Spec:** Download/view
    - [ ] **GraphQL Playground:** (if applicable)

---

## UI/UX Requirements

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Agentic Payments > Developers                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  💻 Developer Resources                                      │
│  Integrate agentic payments into your applications           │
│                                                               │
│  [📚 Docs] [💾 SDKs] [🔗 API] [💡 Examples]                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🚀 Quick Start - Choose Your Protocol                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ ⚡ x402   │  │ 🤖 AP2    │  │ 🛒 ACP    │              │
│  │           │  │           │  │           │              │
│  │ Monetize  │  │ Agent     │  │ Shopping  │              │
│  │ your APIs │  │ Payments  │  │ Carts     │              │
│  │           │  │           │  │           │              │
│  │ [Start] → │  │ [Start] → │  │ [Start] → │              │
│  └───────────┘  └───────────┘  └───────────┘              │
│                                                               │
│  🔑 API Keys                                     [+ New Key]│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Test Key     pk_test_abc...xyz  [📋] [🗑️]  2 hours ago││
│  │ Live Key     pk_live_def...123  [📋] [🗑️]  5 days ago ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  📦 SDKs & Libraries                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │ JS   │ │ PY   │ │ GO   │ │ JAVA │                      │
│  │ v2.1 │ │ v1.5 │ │ v1.2 │ │ v1.0 │                      │
│  │ [📥] │ │ [📥] │ │ [📥] │ │ [📥] │                      │
│  └──────┘ └──────┘ └──────┘ └──────┘                      │
│                                                               │
│  💡 Code Examples                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [x402 Provider] [x402 Consumer] [AP2] [ACP]           ││
│  │ ┌───────────────────────────────────────────────────┐ ││
│  │ │ import { X402Provider } from '@payos/x402-sdk';   │ ││
│  │ │                                                    │ ││
│  │ │ const provider = new X402Provider({               │ ││
│  │ │   apiKey: 'your-api-key',                        │ ││
│  │ │   accountId: 'your-account-id'                   │ ││
│  │ │ });                                               │ ││
│  │ │                                                    │ ││
│  │ │ // Register endpoint                              │ ││
│  │ │ await provider.registerEndpoint(...);            │ ││
│  │ └───────────────────────────────────────────────────┘ ││
│  │                                               [Copy]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
│  🔗 API Reference                          [View Full Docs]│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ POST /v1/x402/endpoints     Create x402 endpoint      ││
│  │ GET  /v1/ap2/mandates       List AP2 mandates         ││
│  │ POST /v1/acp/checkout       Create ACP checkout       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Design System

- **Primary Color:** Purple (#8B5CF6) for developer theme
- **Code Blocks:** Dark theme (VS Code style)
- **Accent Colors:**
  - x402: Blue (#3B82F6)
  - AP2: Green (#10B981)
  - ACP: Orange (#F97316)
- **Cards:** White background, hover effects
- **Typography:**
  - Page title: 3xl, bold
  - Section headers: xl, semibold
  - Code: Monospace font (Fira Code, JetBrains Mono)
- **Icons:** Lucide React + custom protocol icons
- **Syntax Highlighting:** Prism.js or highlight.js

### Responsive Design

- **Desktop (>1024px):** 3-column grid for protocol cards, 2-column for SDKs
- **Tablet (768-1023px):** 2-column grid
- **Mobile (<768px):** Single column, stacked cards

---

## Protocol Quick Start Content

### x402 (HTTP 402 Payment Required)

**Description:** "Monetize any API with automatic micropayments"

**Use Cases:**
- AI model inference APIs
- Data APIs (weather, stock prices)
- Content APIs (articles, media)
- Rate limiting replacement

**Getting Started:**
1. Install SDK: `npm install @payos/x402-provider-sdk`
2. Register your API endpoint
3. Add middleware to your routes
4. Consumers pay automatically per request

**Learn More:** [Link to x402 integration guide]

---

### AP2 (Agent Payment Protocol)

**Description:** "Let AI agents make authorized payments on behalf of users"

**Use Cases:**
- Shopping assistants
- Subscription managers
- Bill payment agents
- Automated bookkeeping

**Getting Started:**
1. Install SDK: `npm install @payos/ap2-sdk`
2. Request user mandate authorization
3. Execute payments within mandate limits
4. Track spending and renewals

**Learn More:** [Link to AP2 integration guide]

---

### ACP (Agentic Commerce Protocol)

**Description:** "Build Stripe/OpenAI-compatible shopping carts for AI agents"

**Use Cases:**
- E-commerce checkouts
- Marketplace transactions
- Multi-item purchases
- Cart management

**Getting Started:**
1. Install SDK: `npm install @payos/acp-sdk`
2. Create checkout session
3. Add items to cart
4. Complete payment

**Learn More:** [Link to ACP integration guide]

---

## Code Examples

### Example 1: x402 Provider Setup

```typescript
import { X402Provider } from '@payos/x402-provider-sdk';
import express from 'express';

const app = express();

// Initialize provider
const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  apiKey: process.env.PAYOS_API_KEY,
  accountId: process.env.PAYOS_ACCOUNT_ID
});

// Register endpoint
await provider.registerEndpoint('/api/data', 'GET', {
  name: 'Weather Data API',
  basePrice: 0.001, // $0.001 per request
  currency: 'USDC'
});

// Add middleware
app.use('/api/data', provider.middleware());

// Your API logic
app.get('/api/data', (req, res) => {
  res.json({ temperature: 72, humidity: 65 });
});

app.listen(3000);
```

### Example 2: x402 Consumer Integration

```typescript
import { X402Client } from '@payos/x402-client-sdk';

const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: 'wallet-id',
  apiKey: 'your-api-key'
});

// Make request (payment handled automatically)
const response = await client.fetch('https://api.example.com/data', {
  autoRetry: true,
  onPayment: (payment) => {
    console.log('Paid:', payment.amount, payment.currency);
  }
});

const data = await response.json();
console.log(data);
```

### Example 3: AP2 Mandate Creation

```typescript
import { AP2Client } from '@payos/ap2-sdk';

const ap2 = new AP2Client({
  apiUrl: 'https://api.payos.com',
  apiKey: 'your-api-key'
});

// Request mandate authorization
const mandate = await ap2.createMandate({
  accountId: 'user-account-id',
  agentId: 'shopping-agent',
  authorizedAmount: 500.00,
  currency: 'USDC',
  expiresAt: new Date('2026-12-31'),
  mandateData: {
    purpose: 'Shopping Assistant',
    merchantWhitelist: ['amazon.com', 'walmart.com']
  }
});

// Execute payment within mandate
const payment = await ap2.executePayment(mandate.id, {
  amount: 49.99,
  merchantId: 'amazon.com',
  description: 'Wireless Headphones'
});
```

### Example 4: ACP Checkout Flow

```typescript
import { ACPClient } from '@payos/acp-sdk';

const acp = new ACPClient({
  apiUrl: 'https://api.payos.com',
  apiKey: 'your-api-key'
});

// Create checkout
const checkout = await acp.createCheckout({
  accountId: 'user-account-id',
  agentId: 'shopping-agent',
  merchantId: 'my-store',
  currency: 'USDC'
});

// Add items
await acp.addItem(checkout.id, {
  name: 'Product A',
  quantity: 2,
  unitPrice: 29.99
});

await acp.addItem(checkout.id, {
  name: 'Product B',
  quantity: 1,
  unitPrice: 49.99
});

// Complete checkout
const result = await acp.completeCheckout(checkout.id, {
  shippingAddress: { /* ... */ }
});

console.log('Transfer ID:', result.transferId);
```

---

## API Reference Quick Table

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/v1/x402/endpoints` | Create x402 endpoint | 100/hour |
| GET | `/v1/x402/endpoints` | List endpoints | 1000/hour |
| POST | `/v1/ap2/mandates` | Create AP2 mandate | 100/hour |
| GET | `/v1/ap2/mandates` | List mandates | 1000/hour |
| POST | `/v1/ap2/execute` | Execute AP2 payment | 500/hour |
| POST | `/v1/acp/checkout` | Create ACP checkout | 500/hour |
| POST | `/v1/acp/items` | Add checkout item | 1000/hour |
| POST | `/v1/acp/complete` | Complete checkout | 500/hour |

---

## SDKs & Libraries

### JavaScript/TypeScript
- **Package:** `@payos/x402-sdk`, `@payos/ap2-sdk`, `@payos/acp-sdk`
- **Install:** `npm install @payos/x402-sdk`
- **Version:** v2.1.0
- **Repo:** https://github.com/payos/x402-js-sdk
- **Docs:** https://docs.payos.com/sdks/javascript

### Python
- **Package:** `payos-x402`, `payos-ap2`, `payos-acp`
- **Install:** `pip install payos-x402`
- **Version:** v1.5.0
- **Repo:** https://github.com/payos/x402-python-sdk
- **Docs:** https://docs.payos.com/sdks/python

### Go
- **Package:** `github.com/payos/x402-go`
- **Install:** `go get github.com/payos/x402-go`
- **Version:** v1.2.0
- **Repo:** https://github.com/payos/x402-go-sdk
- **Docs:** https://docs.payos.com/sdks/go

### Java
- **Package:** `com.payos:x402-sdk`
- **Install:** Maven/Gradle (show snippet)
- **Version:** v1.0.0
- **Repo:** https://github.com/payos/x402-java-sdk
- **Docs:** https://docs.payos.com/sdks/java

---

## Implementation Notes

### File Structure

```
apps/web/src/app/dashboard/agentic-payments/developers/
├── page.tsx                    # Main developers page
└── components/
    ├── QuickStartCards.tsx
    ├── ApiKeysSection.tsx
    ├── SDKsGrid.tsx
    ├── CodeExamples.tsx
    ├── ApiReferenceTable.tsx
    ├── WebhooksSection.tsx
    └── DeveloperTools.tsx
```

### Key Dependencies

```typescript
import { Code, Book, Key, Webhook, Terminal } from 'lucide-react';
import { Card, Button, Tabs, Badge } from '@payos/ui';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
```

### Code Syntax Highlighting

```typescript
<SyntaxHighlighter
  language="typescript"
  style={vscDarkPlus}
  showLineNumbers
  wrapLines
>
  {codeString}
</SyntaxHighlighter>
```

---

## Testing Checklist

- [ ] Page loads correctly
- [ ] All protocol cards display
- [ ] API keys section loads (create, copy, revoke)
- [ ] SDKs grid displays with correct versions
- [ ] Code examples render with syntax highlighting
- [ ] Copy buttons work
- [ ] Links to external docs work
- [ ] Responsive on all screen sizes
- [ ] Dark/light mode compatible

---

## Related Stories

- [STORY_X402_INTEGRATION] - x402 integration guide
- [STORY_AP2_INTEGRATION] - AP2 integration guide
- [STORY_ACP_INTEGRATION] - ACP integration guide

---

**Story Ready for Implementation:** ✅  
**Estimated Effort:** 3-4 days  
**Dependencies:** None



