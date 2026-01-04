# Epic 36: @payos/sdk — Unified SDK & Developer Experience

**Status:** 📋 Pending  
**Phase:** 3.5 / 4 (External Integrations / Customer Validation)  
**Priority:** P0  
**Total Points:** 66  
**Stories:** 0/17 Complete  
**Dependencies:** Epic 17 (Multi-Protocol Gateway), Epic 27 (Settlement Infrastructure), Epic 30 (Structured Responses)  
**Enables:** Agent platform integrations, Partner developer adoption, YC demo readiness  
**Absorbs:** Epic 32 (Tool Discovery)

[← Back to Epic List](./README.md)

---

## Executive Summary

Build `@payos/sdk` — a unified SDK that makes PayOS the **settlement layer** for all agentic payments in LATAM.

**The Core Insight:**
> "We don't compete with protocol SDKs. We complete them."

Protocol SDKs (x402, AP2, ACP) handle authorization and payment intent. They stop at stablecoin settlement. PayOS completes the last mile: **USDC → BRL/MXN via Pix/SPEI**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT PLATFORMS                                   │
│   Claude (MCP)    GPT (Functions)    LangChain    Vercel AI SDK            │
└────────┬───────────────┬─────────────────┬──────────────┬───────────────────┘
         │               │                 │              │
         ▼               ▼                 ▼              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           @payos/sdk                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │     sandbox (mock) ←→ testnet (x402.org) ←→ production (CDP)        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │    x402      │  │     AP2      │  │     ACP      │  │   Direct     │   │
│  │  • @x402/*   │  │  • Mandates  │  │  • Checkout  │  │  • Quotes    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PayOS Sandbox Facilitator                         │   │
│  │  • Mocks on-chain verification (no gas, no real USDC)               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PayOS SETTLEMENT API                                   │
│         /v1/settlements    /v1/capabilities    /v1/compliance               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SETTLEMENT RAILS                                    │
│         Circle USDC    →    Pix (Brazil)    →    SPEI (Mexico)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

| Environment | API URL | x402 Facilitator |
|-------------|---------|------------------|
| `sandbox` | `http://localhost:4000` | PayOS mock facilitator |
| `testnet` | `https://api.sandbox.payos.ai` | x402.org (Base Sepolia) |
| `production` | `https://api.payos.ai` | Coinbase CDP (Base mainnet) |

---

## Stories

### Part 1: Core SDK Foundation

#### Story 36.1: Create @payos/sdk Package Structure

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** None

##### Description

Create the unified SDK package with proper monorepo structure, build configuration, and module exports.

##### Requirements

1. **Package Setup:**
   - Create `packages/sdk/` directory
   - Configure `package.json` with name `@payos/sdk`
   - Add dependencies on official x402 packages
   - Configure TypeScript and build tooling

2. **Multiple Entry Points:**
   - `@payos/sdk` — Main entry, exports PayOS class
   - `@payos/sdk/x402` — x402 client and provider
   - `@payos/sdk/ap2` — AP2 mandate handling
   - `@payos/sdk/acp` — ACP checkout handling

3. **Directory Structure:**
   ```
   packages/sdk/
   ├── package.json
   ├── tsconfig.json
   ├── tsup.config.ts
   ├── src/
   │   ├── index.ts           # Main PayOS class export
   │   ├── types.ts           # All TypeScript types
   │   ├── protocols/
   │   │   ├── x402/
   │   │   ├── ap2/
   │   │   └── acp/
   │   ├── facilitator/
   │   ├── capabilities/
   │   ├── settlements/
   │   └── compliance/
   └── README.md
   ```

4. **Build Configuration:**
   - Dual CJS/ESM output
   - Source maps
   - Type declarations
   - Tree-shakeable

##### Acceptance Criteria

- [ ] Package created with correct structure
- [ ] Dependencies include `@x402/core`, `@x402/evm`, `@x402/fetch`, `@x402/express`
- [ ] Multiple entry points work (`import { PayOS } from '@payos/sdk'`)
- [ ] TypeScript types are exported
- [ ] `pnpm build` succeeds
- [ ] Package can be imported from other packages in monorepo

##### Test Expectations

- Test that package builds without errors
- Test that each entry point exports expected classes
- Test that TypeScript types are accessible

---

#### Story 36.2: Implement Sandbox Facilitator

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.1

##### Description

Create a mock x402 facilitator that implements the standard facilitator interface but skips real blockchain verification. This is critical for local development and testing without gas fees or real USDC.

##### Requirements

1. **Facilitator Interface:**
   - `POST /verify` — Validate payment payload structure (not signature)
   - `POST /settle` — Record payment and return mock tx hash
   - `GET /supported` — Return supported schemes/networks

2. **Mock Behavior:**
   - Accept any properly-formatted x402 payment payload
   - Validate scheme and network match (e.g., `exact-evm`, `eip155:8453`)
   - Skip actual EIP-3009 signature verification
   - Generate realistic-looking `0x...` transaction hashes
   - Call PayOS internal API to record the payment

3. **Configuration Options:**
   - `settlementDelayMs` — Simulate settlement delay (default: 0)
   - `failureRate` — Percentage of payments to randomly fail (default: 0)
   - `debug` — Log detailed info (default: false)

4. **Express Integration:**
   - Factory function to create Express router
   - Can be mounted at any path
   - Works with @x402/express middleware

5. **Internal PayOS Integration:**
   - On settle, create internal transfer record
   - Update wallet balances
   - Emit webhook events

##### Acceptance Criteria

- [ ] `SandboxFacilitator` class implemented
- [ ] Implements `verify()`, `settle()`, `supported()` methods
- [ ] Generates mock transaction hashes
- [ ] Configurable delay and failure rate
- [ ] Express router factory works
- [ ] Compatible with @x402/express verification flow
- [ ] Records payments in PayOS database

##### Test Expectations

- Test verify accepts valid x402 payment structure
- Test verify rejects malformed payloads
- Test settle returns mock transaction hash
- Test configurable failure rate works
- Test integration with PayOS internal transfer API

---

#### Story 36.3: Implement x402 Client with Environment Switching

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.1, 36.2

##### Description

Create an x402 client that wraps the official `@x402/fetch` package but switches between sandbox (mock) and real (blockchain) modes based on environment.

##### Requirements

1. **Environment Modes:**
   - `sandbox`: Uses mock signer, PayOS sandbox facilitator
   - `testnet`: Uses real EVM signer, x402.org facilitator (Base Sepolia)
   - `production`: Uses real EVM signer, Coinbase CDP facilitator (Base mainnet)

2. **Client Interface:**
   ```typescript
   const client = new PayOSX402Client({
     environment: 'sandbox',
     apiKey: 'payos_...',
     // Only needed for testnet/production:
     evmPrivateKey: '0x...',
   });
   
   const response = await client.fetch('https://api.example.com/premium', {
     maxPayment: '$0.01',
   });
   ```

3. **Automatic 402 Handling:**
   - Detect 402 response
   - Parse `accepts` array from response
   - Create payment using appropriate signer
   - Retry request with `X-PAYMENT` header

4. **Spending Limits:**
   - `maxAutoPayAmount` — Max single payment (default: $1)
   - `maxDailySpend` — Daily limit (default: $100)
   - Reject payments exceeding limits

5. **Callbacks:**
   - `onPayment(payment)` — Called before payment sent
   - `onSettlement(settlement)` — Called after settlement confirmed

6. **Status Method:**
   - `getStatus()` returns daily spend, wallet address, environment

7. **Settlement Trigger:**
   - Option to trigger Pix/SPEI settlement after x402 payment
   - `settleToRail: 'pix' | 'spei' | 'none'`

##### Acceptance Criteria

- [ ] Client works in sandbox mode without EVM key
- [ ] Client works in testnet/production with EVM key
- [ ] Automatic 402 detection and retry works
- [ ] Spending limits are enforced
- [ ] Callbacks fire at correct times
- [ ] Works with standard x402 402 responses
- [ ] Can trigger LATAM rail settlement

##### Test Expectations

- Test sandbox mode creates mock payment
- Test spending limit enforcement rejects over-limit payments
- Test 402 detection parses accepts array correctly
- Test callbacks are invoked with correct data
- Test getStatus returns accurate daily spend

---

#### Story 36.4: Implement x402 Provider with Environment Switching

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.1, 36.2

##### Description

Create Express middleware that returns standard x402 402 responses and verifies incoming payments using the appropriate facilitator for the environment.

##### Requirements

1. **Provider Configuration:**
   ```typescript
   const provider = new PayOSX402Provider({
     environment: 'sandbox',
     apiKey: 'payos_...',
     routes: {
       'GET /api/premium': { price: '$0.001', description: 'Premium content' },
       'POST /api/generate': { price: '$0.01', description: 'AI generation' },
     },
   });
   
   app.use(provider.middleware());
   ```

2. **402 Response:**
   - Return 402 with standard `accepts` array
   - Include PayOS facilitator URL for environment
   - Support multiple price options

3. **Payment Verification:**
   - Extract `X-PAYMENT` header
   - Verify with appropriate facilitator
   - Call next() on success

4. **Verify-Then-Serve-Then-Settle Pattern:**
   - Verify payment first
   - Serve content
   - Settle after response sent (non-blocking)

5. **Compatibility:**
   - Works with official `@x402/fetch` clients
   - Works with any x402-compliant client

6. **Auto-Settlement Option:**
   - After x402 payment received, optionally trigger Pix/SPEI settlement
   - Configure destination per route or globally

##### Acceptance Criteria

- [ ] Middleware returns 402 for configured routes
- [ ] 402 response follows x402 spec
- [ ] Verifies X-PAYMENT header correctly
- [ ] Works with sandbox facilitator
- [ ] Compatible with @x402/fetch clients
- [ ] Settlement happens after response
- [ ] Optional LATAM rail settlement works

##### Test Expectations

- Test unpaid request returns 402
- Test 402 response has valid accepts array
- Test valid payment header allows access
- Test invalid payment header returns 402
- Test settlement is non-blocking

---

#### Story 36.5: Implement AP2 Protocol Support

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.1

##### Description

Add AP2 (Google's Agent-to-Agent Protocol) support for mandate-based payments. This wraps the existing AP2 API endpoints (from Epic 17) in the SDK.

##### Requirements

1. **AP2 Client Interface:**
   ```typescript
   const ap2 = payos.ap2;
   
   // Verify a mandate received from another agent
   const mandate = await ap2.verifyMandate(mandateToken);
   
   // Execute a payment against the mandate
   const result = await ap2.executePayment({
     mandate_id: mandate.id,
     amount: '100.00',
     currency: 'USD',
   });
   ```

2. **Mandate Types:**
   - `IntentMandate` — Open-ended intent
   - `CartMandate` — Specific cart items
   - `PaymentMandate` — Fixed amount

3. **A2A x402 Extension:**
   - Support crypto payments within AP2 flow
   - Bridge AP2 mandates to x402 payments

4. **Execution Tracking:**
   - Track `execution_index` for mandate limits
   - Enforce max executions

5. **Sandbox Mode:**
   - Mock mandate verification
   - Test without real AP2 backend

##### Acceptance Criteria

- [ ] AP2 client class implemented
- [ ] Mandate verification works
- [ ] Payment execution works
- [ ] All three mandate types supported
- [ ] Execution limits enforced
- [ ] Sandbox mode for testing

##### Test Expectations

- Test mandate verification returns parsed mandate
- Test payment execution respects mandate limits
- Test execution_index increments correctly
- Test sandbox mode skips real verification

---

#### Story 36.6: Implement ACP Protocol Support

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.1

##### Description

Add ACP (Stripe/OpenAI Agentic Commerce Protocol) support for checkout-based payments. This wraps the existing ACP API endpoints (from Epic 17) in the SDK.

##### Requirements

1. **ACP Client Interface:**
   ```typescript
   const acp = payos.acp;
   
   // Create a checkout session
   const checkout = await acp.createCheckout({
     cart_items: [...],
     return_url: 'https://...',
   });
   
   // Complete checkout with SharedPaymentToken
   const result = await acp.completeCheckout({
     checkout_id: checkout.id,
     payment_token: 'spt_...',
   });
   ```

2. **SharedPaymentToken (SPT):**
   - Accept SPT from agent
   - Validate with Stripe
   - Complete payment

3. **Cart Items:**
   - Support multiple items
   - Calculate totals

4. **Webhook Handling:**
   - Helper for processing ACP webhooks
   - Validate webhook signatures

5. **Sandbox Mode:**
   - Mock Stripe integration
   - Test without real Stripe

##### Acceptance Criteria

- [ ] ACP client class implemented
- [ ] Checkout creation works
- [ ] SPT completion works
- [ ] Cart item handling works
- [ ] Webhook helper implemented
- [ ] Sandbox mode for testing

##### Test Expectations

- Test checkout creation returns valid session
- Test SPT completion processes payment
- Test invalid SPT returns appropriate error
- Test webhook signature validation

---

#### Story 36.7: Implement Main PayOS Class

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.3, 36.4, 36.5, 36.6

##### Description

Create the main `PayOS` class that provides unified access to all protocols and direct API methods.

##### Requirements

1. **Constructor:**
   ```typescript
   const payos = new PayOS({
     apiKey: 'payos_...',
     environment: 'sandbox', // or 'testnet', 'production'
     evmPrivateKey: '0x...', // optional, for testnet/production x402
   });
   ```

2. **Protocol Clients:**
   - `payos.x402` — x402 client
   - `payos.ap2` — AP2 client
   - `payos.acp` — ACP client

3. **Direct API:**
   - `payos.settlements.quote()` — Get settlement quote
   - `payos.settlements.create()` — Create settlement
   - `payos.compliance.check()` — Check recipient
   - `payos.capabilities.list()` — List capabilities

4. **Factory Methods:**
   - `payos.createProvider(config)` — Create x402 provider middleware

5. **Environment Handling:**
   - Auto-configure URLs based on environment
   - Validate required credentials per environment

##### Acceptance Criteria

- [ ] PayOS class created with proper constructor
- [ ] Protocol clients accessible
- [ ] Direct API methods work
- [ ] Factory methods work
- [ ] Environment auto-configuration works
- [ ] Credential validation per environment

##### Test Expectations

- Test PayOS class instantiates correctly
- Test protocol clients are accessible
- Test environment URLs are correct
- Test missing credentials throw for testnet/production

---

### Part 2: API Endpoints

#### Story 36.8: Add Sandbox Facilitator API Endpoints

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.2

##### Description

Mount the sandbox facilitator as API endpoints on the PayOS API server so the SDK can use it for local development.

##### Requirements

1. **Endpoints:**
   - `POST /v1/x402/facilitator/verify` — Verify payment
   - `POST /v1/x402/facilitator/settle` — Settle payment
   - `GET /v1/x402/facilitator/supported` — List supported schemes

2. **Database Integration:**
   - Record verified payments
   - Create internal transfers on settlement
   - Link to sandbox accounts

3. **Environment Control:**
   - Only enabled in development/sandbox mode
   - Return 404 in production

4. **Logging:**
   - Log all facilitator requests
   - Debug mode for troubleshooting

##### Acceptance Criteria

- [ ] All three endpoints implemented
- [ ] Payments recorded in database
- [ ] Internal transfers created on settle
- [ ] Disabled in production
- [ ] Proper logging

##### Test Expectations

- Test verify endpoint accepts valid payload
- Test settle endpoint returns transaction hash
- Test supported endpoint returns schemes
- Test endpoints 404 in production mode

---

### Part 3: Tool Discovery

#### Story 36.9: Capabilities API Endpoint

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** Epic 30 (structured responses)

##### Description

Create `/v1/capabilities` endpoint that returns machine-readable definitions of all PayOS operations. This enables AI agents to discover what PayOS can do.

##### Requirements

1. **Response Structure:**
   ```json
   {
     "api_version": "2025-12-01",
     "capabilities": [
       {
         "name": "create_transfer",
         "description": "Create a cross-border transfer with automatic FX",
         "category": "payments",
         "endpoint": "POST /v1/transfers",
         "parameters": {
           "type": "object",
           "required": ["from_account_id", "to_account_id", "amount", "currency"],
           "properties": { ... }
         },
         "returns": { ... },
         "errors": ["INSUFFICIENT_BALANCE", "INVALID_ACCOUNT_ID", ...],
         "supports_simulation": true,
         "supports_idempotency": true
       }
     ],
     "limits": {
       "rate_limit": "1000/hour",
       "max_transfer": "100000.00"
     },
     "supported_currencies": ["USD", "BRL", "MXN"],
     "supported_rails": ["pix", "spei"],
     "webhook_events": ["transfer.created", "transfer.completed", ...]
   }
   ```

2. **Categories:**
   - `payments` — Transfers, refunds
   - `settlements` — Quotes, settlements
   - `accounts` — Account management
   - `agents` — Agent management
   - `compliance` — Compliance checks
   - `simulation` — Dry-run operations

3. **Capability Details:**
   - Name and description
   - HTTP method and endpoint
   - Parameter schema (JSON Schema)
   - Return type schema
   - Possible error codes
   - Whether simulation is supported
   - Whether idempotency is supported

4. **Versioning:**
   - Include `api_version` field
   - Support version query param for future compatibility

##### Acceptance Criteria

- [ ] Endpoint returns all PayOS capabilities
- [ ] Each capability has full parameter schema
- [ ] Each capability lists possible errors
- [ ] Supported currencies and rails included
- [ ] Webhook events listed
- [ ] Response follows Epic 30 format

##### Test Expectations

- Test response includes all major operations
- Test parameter schemas are valid JSON Schema
- Test error codes match Epic 30 taxonomy
- Test version field is present

---

#### Story 36.10: Function-Calling Format for LLM Agents

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.9

##### Description

Create `/v1/capabilities/function-calling` endpoint that returns capabilities in formats optimized for LLM function calling (OpenAI and Anthropic).

##### Requirements

1. **OpenAI Format:**
   ```json
   {
     "openai_functions": [
       {
         "name": "payos_create_transfer",
         "description": "Create a cross-border payment...",
         "parameters": {
           "type": "object",
           "required": [...],
           "properties": { ... }
         }
       }
     ]
   }
   ```

2. **Anthropic Format:**
   ```json
   {
     "anthropic_tools": [
       {
         "name": "payos_create_transfer",
         "description": "Create a cross-border payment...",
         "input_schema": { ... }
       }
     ]
   }
   ```

3. **Naming Convention:**
   - Prefix all functions with `payos_`
   - Use snake_case

4. **Descriptions:**
   - Write clear descriptions for LLM understanding
   - Include examples in descriptions where helpful
   - Mention constraints and limits

5. **Query Parameters:**
   - `?format=openai` — OpenAI only
   - `?format=anthropic` — Anthropic only
   - No param — Both formats

##### Acceptance Criteria

- [ ] Endpoint returns OpenAI-compatible functions
- [ ] Endpoint returns Anthropic-compatible tools
- [ ] Descriptions are LLM-friendly
- [ ] Format query param works
- [ ] All capabilities converted

##### Test Expectations

- Test OpenAI format matches spec
- Test Anthropic format matches spec
- Test format query param filters correctly
- Test descriptions are meaningful

---

### Part 4: Agent Platform Integrations

#### Story 36.11: MCP Server for Claude/LLM Integration

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.7, 36.9, 36.10

##### Description

Build an MCP (Model Context Protocol) server so Claude and other LLMs can natively call PayOS APIs. **This is the YC demo centerpiece.**

##### Requirements

1. **MCP Tools:**
   - `payos_quote` — Get settlement quote
   - `payos_settle` — Execute settlement
   - `payos_status` — Check settlement status
   - `payos_batch_settle` — Batch settlements
   - `payos_compliance_check` — Check recipient
   - `payos_capabilities` — List available operations

2. **Package:**
   - Published as `@payos/mcp-server` on npm
   - Standalone executable
   - Configuration via env vars or config file

3. **Dynamic Tool Generation:**
   - Fetch capabilities from `/v1/capabilities/function-calling`
   - Generate MCP tools dynamically
   - Cache with reasonable TTL

4. **MCP Client Compatibility:**
   - Works with Claude Desktop
   - Works with Cursor
   - Works with other MCP clients

5. **Demo Scenario:**
   - Claude can be asked "Send $100 to João in Brazil"
   - Claude uses tools to quote, check compliance, settle
   - User sees real Pix settlement

##### Acceptance Criteria

- [ ] MCP server package created
- [ ] All 6 core tools implemented
- [ ] Published to npm
- [ ] Works with Claude Desktop
- [ ] Works with Cursor
- [ ] Demo video created showing Claude settling payment

##### Test Expectations

- Test MCP server starts correctly
- Test tool discovery returns all tools
- Test quote tool returns valid quote
- Test settle tool executes settlement
- Test integration with Claude Desktop

---

#### Story 36.12: LangChain Tools Integration

**Points:** 3  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.7, 36.10

##### Description

Build LangChain-compatible tools for Python agent developers.

##### Requirements

1. **Package:**
   - Published as `payos-langchain` on PyPI
   - Python 3.9+ compatible

2. **Tool Generation:**
   - Fetch from `/v1/capabilities/function-calling`
   - Generate LangChain Tool objects
   - Support OpenAI, Anthropic, local models

3. **Usage:**
   ```python
   from payos_langchain import get_payos_tools
   
   tools = get_payos_tools(api_key="payos_...")
   agent = create_agent(llm, tools)
   ```

4. **Example Notebooks:**
   - Basic settlement example
   - Batch processing example
   - Compliance checking example

##### Acceptance Criteria

- [ ] Package published to PyPI
- [ ] Tools generated from capabilities API
- [ ] Works with OpenAI models
- [ ] Works with Anthropic models
- [ ] Example notebooks provided

##### Test Expectations

- Test package installs correctly
- Test tools are generated correctly
- Test tool execution works with mock LLM
- Test integration with real OpenAI

---

#### Story 36.13: Vercel AI SDK & OpenAI Functions

**Points:** 3  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 36.7, 36.10

##### Description

Build Vercel AI SDK tools and OpenAI function definitions for JavaScript/TypeScript agent developers.

##### Requirements

1. **Packages:**
   - `@payos/ai-sdk` — Vercel AI SDK tools
   - `@payos/openai` — OpenAI function definitions

2. **Vercel AI SDK Integration:**
   - Compatible with Vercel AI SDK 3.x
   - Works with `ai` package

3. **OpenAI Functions:**
   - Generate function definitions
   - Handle function call responses

4. **Example App:**
   - Next.js example with chat interface
   - Demonstrates payment flow

##### Acceptance Criteria

- [ ] Both packages published to npm
- [ ] Vercel AI SDK 3.x compatible
- [ ] OpenAI functions work
- [ ] Example Next.js app provided

##### Test Expectations

- Test packages install correctly
- Test tools work with Vercel AI SDK
- Test OpenAI functions are valid

---

### Part 5: Developer Experience

#### Story 36.14: Update Sample Apps to Use New SDK

**Points:** 5  
**Priority:** P0  
**Assignee:** Cursor  
**Dependencies:** 36.7

##### Description

Migrate the existing sample apps to use the new unified SDK, demonstrating proper usage patterns.

##### Requirements

1. **sample-provider Migration:**
   - Replace custom x402 implementation
   - Use `payos.createProvider()` 
   - Configure routes with prices
   - Show settlement flow

2. **sample-consumer Migration:**
   - Replace custom x402 client
   - Use `payos.x402.fetch()`
   - Show spending limits
   - Show payment callbacks

3. **E2E Test Flow:**
   - Consumer fetches protected resource
   - Provider returns 402
   - Consumer creates payment
   - Provider verifies and serves
   - Settlement completes

4. **Sandbox Mode:**
   - Both apps work in sandbox (no blockchain)
   - Clear instructions for local testing

5. **Documentation:**
   - Updated README for each app
   - Clear setup instructions
   - Explanation of what's happening

##### Acceptance Criteria

- [ ] sample-provider uses new SDK
- [ ] sample-consumer uses new SDK
- [ ] E2E test passes
- [ ] Works in sandbox mode
- [ ] READMEs updated

##### Test Expectations

- Test E2E flow completes successfully
- Test sandbox mode works without EVM keys
- Test payment appears in PayOS database

---

#### Story 36.15: Deprecate Old SDKs & Migration Guide

**Points:** 2  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 36.14

##### Description

Add deprecation warnings to old SDK packages and create migration documentation.

##### Requirements

1. **Deprecation Notices:**
   - `@payos/x402-client-sdk` — Console warning on import
   - `@payos/x402-provider-sdk` — Console warning on import
   - Point to new `@payos/sdk`

2. **Migration Guide:**
   - Document all breaking changes
   - Side-by-side code comparisons
   - Step-by-step migration instructions

3. **npm Deprecation:**
   - Mark old packages as deprecated on npm
   - Update package descriptions

##### Acceptance Criteria

- [ ] Old packages show deprecation warning
- [ ] Migration guide created at `docs/guides/SDK_MIGRATION.md`
- [ ] npm packages marked deprecated

##### Test Expectations

- Test deprecation warning appears on import
- Test migration guide covers all APIs

---

#### Story 36.16: Developer Portal & Documentation

**Points:** 5  
**Priority:** P1  
**Assignee:** Cursor  
**Dependencies:** 36.7, 36.11, 36.12

##### Description

Build comprehensive developer documentation for the SDK and API.

##### Requirements

1. **Documentation Site:**
   - Deploy to docs.payos.ai or similar
   - Clean, searchable
   - Mobile responsive

2. **Getting Started:**
   - First API call in <5 minutes
   - Clear prerequisites
   - Copy-paste examples

3. **SDK Reference:**
   - All classes documented
   - All methods documented
   - TypeScript types shown

4. **API Reference:**
   - All endpoints documented
   - Request/response examples
   - Error codes explained

5. **Guides:**
   - x402 integration guide
   - AP2 integration guide
   - ACP integration guide
   - MCP setup guide
   - LangChain setup guide

##### Acceptance Criteria

- [ ] Documentation site deployed
- [ ] Getting started takes <5 minutes
- [ ] All SDK classes documented
- [ ] All API endpoints documented
- [ ] Integration guides complete

##### Test Expectations

- Test all code examples work
- Test links are not broken

---

### Part 6: UI Stories (Gemini)

#### Story 36.17: Capabilities Explorer (UI)

**Points:** 3  
**Priority:** P1  
**Assignee:** Gemini  
**Dependencies:** 36.9

##### Description

Create an interactive Capabilities Explorer in the dashboard where developers can browse all PayOS operations.

##### Requirements

1. **Navigation:**
   - Sidebar with categories
   - Tree view of capabilities
   - Search filter

2. **Capability Detail:**
   - Description
   - Endpoint (method + path)
   - Parameters table (name, type, required, description)
   - Possible error codes (link to error reference)
   - Simulation/idempotency badges

3. **Code Snippets:**
   - TypeScript example
   - Python example
   - cURL example
   - Copy button

4. **Actions:**
   - Try in Playground (link)
   - View Full Docs (link)

##### Acceptance Criteria

- [ ] Fetches from `GET /v1/capabilities`
- [ ] Tree navigation works
- [ ] Search filters in real-time
- [ ] Code snippets generate correctly
- [ ] Copy button works
- [ ] Responsive layout

---

## Story Summary

| Story | Points | Priority | Assignee | Description |
|-------|--------|----------|----------|-------------|
| 36.1 | 3 | P0 | Cursor | Package structure |
| 36.2 | 5 | P0 | Cursor | Sandbox facilitator |
| 36.3 | 5 | P0 | Cursor | x402 client |
| 36.4 | 5 | P0 | Cursor | x402 provider |
| 36.5 | 5 | P0 | Cursor | AP2 support |
| 36.6 | 5 | P0 | Cursor | ACP support |
| 36.7 | 3 | P0 | Cursor | Main PayOS class |
| 36.8 | 3 | P0 | Cursor | Facilitator API endpoints |
| 36.9 | 3 | P0 | Cursor | Capabilities API |
| 36.10 | 3 | P0 | Cursor | Function-calling format |
| 36.11 | 5 | P0 | Cursor | MCP server (**YC DEMO**) |
| 36.12 | 3 | P0 | Cursor | LangChain tools |
| 36.13 | 3 | P1 | Cursor | Vercel/OpenAI |
| 36.14 | 5 | P0 | Cursor | Update sample apps |
| 36.15 | 2 | P1 | Cursor | Deprecation |
| 36.16 | 5 | P1 | Cursor | Documentation |
| 36.17 | 3 | P1 | **Gemini** | Capabilities Explorer UI |
| **Total** | **66** | | | |

---

## Success Criteria

1. **Sandbox works without blockchain** — Developers test full flows locally
2. **Compatible with x402 ecosystem** — Official @x402/fetch clients work
3. **Multi-protocol support** — x402, AP2, ACP all work
4. **Agent platform ready** — Claude MCP, LangChain, Vercel AI work
5. **Tool discovery works** — Agents query capabilities programmatically
6. **LATAM settlement** — All payments settle to Pix/SPEI

---

## Related Documentation

- [x402 Protocol Spec](https://github.com/coinbase/x402)
- [Epic 17: Multi-Protocol Gateway](./epic-17-multi-protocol.md)
- [Epic 27: Settlement Infrastructure](./epic-27-settlement.md)
- [Epic 30: Structured Responses](./epic-30-structured-response.md)
