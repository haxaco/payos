# Epic 53: Card Network Agentic Commerce Integration

**Status:** PLANNED
**Phase:** 4.5 (Card Network Integration)
**Priority:** P1 — Extends Settlement Rail Options
**Estimated Points:** 62
**Stories:** 11
**Dependencies:** Epic 27 (Settlement), Epic 48 (Connected Accounts), Epic 50 (Settlement Decoupling)
**Created:** January 21, 2026
**Updated:** January 21, 2026

[← Back to Epic List](./README.md)

---

## Executive Summary

Integrate **both Visa Intelligent Commerce (VIC)** and **Mastercard Agent Pay** as settlement rail options within PayOS. This enables card-based agent payments alongside existing stablecoin (Circle USDC) and local rail (Pix/SPEI) settlement, positioning PayOS as a **truly protocol-agnostic orchestration layer**.

**Why Both Networks:**
- Different merchant/issuer relationships — merchants may accept one or both
- LATAM timing: Mastercard launched Agent Pay in LATAM Dec 2025; Visa expanding 2026
- Redundancy and negotiating leverage with card networks
- Complete market coverage for agents

**Key Insight:** Both networks converged on the **same underlying standard** (Web Bot Auth / HTTP Message Signatures / RFC 9421) developed with Cloudflare. This means we can build a unified verification layer that works for both.

---

## Strategic Context

> **"PayOS works with Visa, Mastercard, and everything else."**

### Card Network Comparison

| Aspect | Visa VIC | Mastercard Agent Pay |
|--------|----------|---------------------|
| **Launch Date** | April 2025 | April 29, 2025 |
| **Protocol Name** | Trusted Agent Protocol (TAP) | Agent Pay Acceptance Framework |
| **Agent Identity Standard** | Web Bot Auth + HTTP Message Signatures (RFC 9421) | Same — Web Bot Auth + RFC 9421 |
| **Tokenization** | Visa Token Service (VTS) | Agentic Tokens (Dynamic Token Verification Code) |
| **Cryptography** | Ed25519 / RSA-SHA256 | Same |
| **MCP Server** | Yes (Visa Developer Center) | Yes (Agent Toolkit on Mastercard Developers) |
| **No-Code Merchant Option** | Yes (CDN layer verification) | Yes (submit via standard checkout forms) |
| **Developer Portal** | developer.visa.com | developer.mastercard.com |
| **GitHub** | github.com/visa/trusted-agent-protocol | N/A (specs on Mastercard Developers) |
| **Key Partners** | OpenAI, Anthropic, Microsoft, Skyfire, Stripe, Adyen | Microsoft, PayPal, Fiserv, Stripe, Google, IBM |
| **LATAM Status** | Expanding 2026 | **Live Dec 2025** (Getnet, Davivienda, MagaluPay) |
| **US Cardholder Enablement** | Holiday 2025 | Holiday 2025 (Citi, US Bank first) |

### Shared Technical Foundation

Both networks partnered with **Cloudflare** to build on the same standards:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WEB BOT AUTH STANDARD                           │
│         (Cloudflare + Visa + Mastercard + Microsoft)                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              HTTP Message Signatures (RFC 9421)              │   │
│  │                                                              │   │
│  │  • Ed25519 / RSA-SHA256 cryptographic signatures            │   │
│  │  • Signature-Input header with covered components           │   │
│  │  • Signature header with base64-encoded signature           │   │
│  │  • Key ID references agent's registered public key          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│              ┌───────────────┴───────────────┐                      │
│              ▼                               ▼                      │
│  ┌─────────────────────┐         ┌─────────────────────┐           │
│  │   Visa TAP          │         │   Mastercard        │           │
│  │                     │         │   Agent Pay         │           │
│  │ • Agent Registry    │         │ • Agent Registry    │           │
│  │ • VTS Tokens        │         │ • Agentic Tokens    │           │
│  │ • VisaNet settle    │         │ • MasterCard settle │           │
│  └─────────────────────┘         └─────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### What Card Networks Provide vs. Don't Provide

| Card Networks Provide | Card Networks Don't Provide |
|-----------------------|----------------------------|
| Agent identity verification | Stablecoin settlement |
| Card tokenization | Pix/SPEI local rails |
| Fraud controls | Enterprise governance |
| VisaNet/MasterCard settlement | Multi-rail routing optimization |
| Consumer dispute rights | Protocol-agnostic orchestration |

**PayOS fills the gaps** — we orchestrate card rails alongside crypto and local rails.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  AGENT (x402/AP2/ACP/UCP/VIC/Mastercard)                            │
│  Payment Request                                                    │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PayOS ORCHESTRATION LAYER                                          │
│                                                                     │
│  1. Governance Check (Epic 29 - policies, budgets, approvals)       │
│  2. Agent Verification (Unified Web Bot Auth verifier)              │
│  3. Settlement Decision Engine (Epic 50 - enhanced)                 │
│     ├─ Evaluate: Visa, Mastercard, Circle, Pix, SPEI               │
│     ├─ Consider: Fees, speed, acceptance, issuer, location          │
│     └─ Select optimal rail                                          │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    ▼                         ▼                         ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│     Visa      │     │  Mastercard   │     │    Circle     │
│     VIC       │     │   Agent Pay   │     │  (Stablecoin) │
│               │     │               │     │               │
│ - TAP verify  │     │ - Web Bot Auth│     │ - USDC settle │
│ - VTS tokens  │     │ - Agentic Tok │     │ - Pix payout  │
│ - VisaNet     │     │ - MC Network  │     │ - SPEI payout │
│ - 2.9%+$0.30  │     │ - 2.9%+$0.30  │     │ - ~1%         │
│ - T+1         │     │ - T+1         │     │ - Instant     │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority | Notes |
|------------------|------------|--------|----------|-------|
| `POST /v1/cards/verify` | ✅ Yes | `payos.cards` | P0 | Unified Web Bot Auth verification |
| `POST /v1/cards/visa/instructions` | ✅ Yes | `payos.cards.visa` | P0 | VIC payment instruction |
| `POST /v1/cards/mastercard/instructions` | ✅ Yes | `payos.cards.mastercard` | P0 | MC Agent Pay instruction |
| `GET /v1/cards/:network/credentials/:id` | ✅ Yes | `payos.cards` | P0 | Credential retrieval |
| `POST /v1/cards/:network/signals` | ✅ Yes | `payos.cards` | P1 | Commerce signal submission |
| `POST /v1/settlements/route` | ✅ Yes | `payos.settlements` | P0 | Enhanced with card rails |
| Card MCP tools | ✅ MCP | `@sly/mcp` | P1 | `cards_create_instruction`, etc. |
| Dashboard card settings | ❌ No | - | P1 | Dashboard only |

**SDK Stories Required:** 
- [ ] Story 36.X: Add `cards` module to @sly/sdk (unified interface)
- [ ] Story 36.Y: Add card tools to MCP server
- [ ] Story 36.Z: Update `settlements.route()` with card rail options

---

## Stories

### Story 53.1: Card Network Developer Accounts & Sandbox Setup

**Points:** 3
**Priority:** P0
**Dependencies:** None

**Description:**
Establish PayOS presence in both Visa and Mastercard developer ecosystems. Create developer accounts, obtain sandbox credentials, and configure development environment.

**Visa Setup:**
1. Create account at developer.visa.com
2. Register as "Agent Enabler" partner
3. Request VIC Sandbox access
4. Clone TAP GitHub repo (github.com/visa/trusted-agent-protocol)
5. Review TAP specification and sample implementation

**Mastercard Setup:**
1. Create account at developer.mastercard.com
2. Register for Agent Pay program
3. Request Agent Pay sandbox access
4. Download Agent Toolkit (MCP server)
5. Review Agent Pay Acceptance Framework documentation

**Acceptance Criteria:**
- [ ] Visa Developer account created with VIC sandbox access
- [ ] Mastercard Developer account created with Agent Pay sandbox access
- [ ] TAP GitHub repo cloned and sample code reviewed
- [ ] Mastercard Agent Toolkit downloaded
- [ ] Both sets of credentials stored in secrets manager
- [ ] Contact established with both BD teams
- [ ] Setup documentation created for team

**Environment Variables:**
```bash
# .env.local (never commit)

# Visa VIC
VISA_SANDBOX_API_KEY=xxx
VISA_SANDBOX_SHARED_SECRET=xxx
VISA_SANDBOX_CERTIFICATE_ID=xxx
VISA_TAP_KEY_DIRECTORY=https://developer.visa.com/.well-known/tap-keys

# Mastercard Agent Pay
MC_SANDBOX_CONSUMER_KEY=xxx
MC_SANDBOX_KEYSTORE_PATH=/path/to/sandbox.p12
MC_SANDBOX_KEYSTORE_PASSWORD=xxx
MC_AGENT_DIRECTORY=https://developer.mastercard.com/.well-known/agent-keys
```

**Files to Create:**
- `apps/api/.env.example` (add card network placeholder variables)
- `docs/integrations/visa-setup.md`
- `docs/integrations/mastercard-setup.md`

---

### Story 53.2: Unified Web Bot Auth Verification Service

**Points:** 8
**Priority:** P0
**Dependencies:** 53.1

**Description:**
Build a unified agent verification service that supports **both** Visa TAP and Mastercard Agent Pay. Since both protocols use the same Web Bot Auth / HTTP Message Signatures (RFC 9421) standard, we can create a single verification layer that works for either network.

**Technical Foundation:**
Both networks use:
- HTTP Message Signatures (RFC 9421)
- Ed25519 or RSA-SHA256 signatures
- Signature-Input header with covered components
- Public keys in network-specific directories

**Database Schema:**
```sql
-- Migration: YYYYMMDD_card_agent_verification.sql

-- Cache for card network public keys (both Visa and Mastercard)
CREATE TABLE card_network_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL CHECK (network IN ('visa', 'mastercard')),
  key_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'ed25519',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(network, key_id)
);

CREATE INDEX idx_card_network_keys_lookup ON card_network_keys(network, key_id);

-- Agent verification audit log
CREATE TABLE card_agent_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  
  -- Network identification
  network TEXT NOT NULL CHECK (network IN ('visa', 'mastercard')),
  
  -- Request details
  agent_key_id TEXT NOT NULL,
  signature_input TEXT NOT NULL,
  signature TEXT NOT NULL,
  
  -- Verification result
  verified BOOLEAN NOT NULL,
  failure_reason TEXT,
  
  -- Agent identity (from signature)
  agent_provider TEXT,                   -- e.g., "openai", "anthropic"
  agent_id TEXT,
  consumer_id TEXT,                      -- Anonymized consumer reference
  interaction_type TEXT,                 -- 'browse' or 'payment'
  
  -- Request context
  request_domain TEXT,
  request_path TEXT,
  ip_address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_card_agent_verifications_tenant ON card_agent_verifications(tenant_id, created_at DESC);
CREATE INDEX idx_card_agent_verifications_network ON card_agent_verifications(network, created_at DESC);
```

**TypeScript Implementation:**
```typescript
// packages/cards/src/web-bot-auth-verifier.ts

import { createVerify } from 'crypto';

type CardNetwork = 'visa' | 'mastercard';

interface SignatureComponents {
  keyId: string;
  algorithm: string;
  created: number;
  expires?: number;
  nonce?: string;
  signature: string;
  signatureInput: string;
  coveredComponents: string[];
}

interface AgentVerificationResult {
  verified: boolean;
  network: CardNetwork;
  agentProvider?: string;
  agentId?: string;
  consumerId?: string;
  interactionType?: 'browse' | 'payment';
  failureReason?: string;
}

export class WebBotAuthVerifier {
  private keyCache: Map<string, { key: string; expiresAt: Date }> = new Map();
  
  private keyDirectories: Record<CardNetwork, string> = {
    visa: process.env.VISA_TAP_KEY_DIRECTORY || 'https://developer.visa.com/.well-known/tap-keys',
    mastercard: process.env.MC_AGENT_DIRECTORY || 'https://developer.mastercard.com/.well-known/agent-keys'
  };

  /**
   * Verify a Web Bot Auth signature from an incoming request.
   * Works for both Visa TAP and Mastercard Agent Pay.
   */
  async verifyRequest(
    headers: Record<string, string>,
    method: string,
    path: string,
    body?: string
  ): Promise<AgentVerificationResult> {
    try {
      // 1. Parse Signature-Input and Signature headers (RFC 9421)
      const components = this.parseSignatureHeaders(headers);
      
      // 2. Determine network from key ID prefix or header
      const network = this.detectNetwork(components.keyId, headers);
      
      // 3. Fetch public key from appropriate network directory
      const publicKey = await this.getPublicKey(network, components.keyId);
      
      // 4. Reconstruct signature base string per RFC 9421
      const signatureBase = this.buildSignatureBase(
        components,
        headers,
        method,
        path,
        body
      );
      
      // 5. Verify signature
      const verified = this.verifySignature(
        signatureBase,
        components.signature,
        publicKey,
        components.algorithm
      );
      
      // 6. Validate timing (created, expires)
      if (verified) {
        this.validateTiming(components);
      }
      
      // 7. Extract agent identity from headers
      const identity = this.extractAgentIdentity(headers, network);
      
      return {
        verified,
        network,
        ...identity
      };
    } catch (error) {
      return {
        verified: false,
        network: 'visa', // Default, will be overridden if detectable
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect which card network based on key ID format or headers
   */
  private detectNetwork(keyId: string, headers: Record<string, string>): CardNetwork {
    // Check for explicit network header
    const networkHeader = headers['x-card-network']?.toLowerCase();
    if (networkHeader === 'visa' || networkHeader === 'mastercard') {
      return networkHeader;
    }
    
    // Visa TAP key IDs typically start with 'visa_' or contain visa identifiers
    if (keyId.startsWith('visa_') || keyId.includes('visa')) {
      return 'visa';
    }
    
    // Mastercard key IDs typically start with 'mc_' or contain mastercard identifiers
    if (keyId.startsWith('mc_') || keyId.includes('mastercard')) {
      return 'mastercard';
    }
    
    // Default to Visa (can be configured)
    return 'visa';
  }

  /**
   * Parse RFC 9421 Signature-Input and Signature headers
   */
  private parseSignatureHeaders(headers: Record<string, string>): SignatureComponents {
    const signatureInput = headers['signature-input'];
    const signature = headers['signature'];
    
    if (!signatureInput || !signature) {
      throw new Error('Missing Web Bot Auth signature headers');
    }
    
    // Parse structured field format: sig1=("@method" "@path" ...);keyid="xxx";alg="ed25519";created=xxx
    const match = signatureInput.match(/sig1=\(([^)]+)\);(.+)/);
    if (!match) {
      throw new Error('Invalid Signature-Input format');
    }
    
    const coveredComponents = match[1].split(' ').map(c => c.replace(/"/g, ''));
    const params = this.parseParams(match[2]);
    
    return {
      keyId: params.keyid,
      algorithm: params.alg || 'ed25519',
      created: parseInt(params.created, 10),
      expires: params.expires ? parseInt(params.expires, 10) : undefined,
      nonce: params.nonce,
      signature: signature.replace('sig1=:', '').replace(':', ''),
      signatureInput,
      coveredComponents
    };
  }

  private parseParams(paramStr: string): Record<string, string> {
    const params: Record<string, string> = {};
    const regex = /(\w+)=(?:"([^"]*)"|(\d+))/g;
    let match;
    while ((match = regex.exec(paramStr)) !== null) {
      params[match[1]] = match[2] || match[3];
    }
    return params;
  }

  /**
   * Fetch public key from network's key directory (with caching)
   */
  private async getPublicKey(network: CardNetwork, keyId: string): Promise<string> {
    const cacheKey = `${network}:${keyId}`;
    const cached = this.keyCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.key;
    }
    
    const directoryUrl = this.keyDirectories[network];
    const response = await fetch(`${directoryUrl}/${keyId}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${network} public key: ${response.status}`);
    }
    
    const { publicKey, validUntil } = await response.json();
    
    // Cache for 1 hour or until key expires
    this.keyCache.set(cacheKey, {
      key: publicKey,
      expiresAt: new Date(Math.min(
        Date.now() + 3600000,
        validUntil ? new Date(validUntil).getTime() : Date.now() + 3600000
      ))
    });
    
    return publicKey;
  }

  /**
   * Build signature base string per RFC 9421
   */
  private buildSignatureBase(
    components: SignatureComponents,
    headers: Record<string, string>,
    method: string,
    path: string,
    body?: string
  ): string {
    const lines: string[] = [];
    
    for (const component of components.coveredComponents) {
      if (component === '@method') {
        lines.push(`"@method": ${method.toUpperCase()}`);
      } else if (component === '@path') {
        lines.push(`"@path": ${path}`);
      } else if (component === '@authority') {
        lines.push(`"@authority": ${headers['host']}`);
      } else if (component === '@target-uri') {
        lines.push(`"@target-uri": https://${headers['host']}${path}`);
      } else if (component.startsWith('@')) {
        // Other derived components
        const value = this.getDerivedComponent(component, headers, method, path);
        lines.push(`"${component}": ${value}`);
      } else {
        // Regular header
        const headerValue = headers[component.toLowerCase()];
        if (headerValue) {
          lines.push(`"${component.toLowerCase()}": ${headerValue}`);
        }
      }
    }
    
    // Add signature params line
    const paramsStart = components.signatureInput.indexOf(';');
    lines.push(`"@signature-params": (${components.coveredComponents.map(c => `"${c}"`).join(' ')})${components.signatureInput.slice(paramsStart)}`);
    
    return lines.join('\n');
  }

  private getDerivedComponent(component: string, headers: Record<string, string>, method: string, path: string): string {
    switch (component) {
      case '@request-target':
        return `${method.toLowerCase()} ${path}`;
      case '@scheme':
        return 'https';
      default:
        return '';
    }
  }

  /**
   * Verify signature using public key
   */
  private verifySignature(
    signatureBase: string,
    signature: string,
    publicKey: string,
    algorithm: string
  ): boolean {
    try {
      if (algorithm === 'ed25519') {
        const verify = createVerify('ed25519');
        verify.update(signatureBase);
        return verify.verify(publicKey, Buffer.from(signature, 'base64'));
      } else if (algorithm === 'rsa-sha256' || algorithm === 'rsa-pss-sha256') {
        const verify = createVerify('RSA-SHA256');
        verify.update(signatureBase);
        return verify.verify(publicKey, Buffer.from(signature, 'base64'));
      }
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate signature timing
   */
  private validateTiming(components: SignatureComponents): void {
    const now = Math.floor(Date.now() / 1000);
    
    // Check created time (allow 5 minute clock skew)
    if (components.created > now + 300) {
      throw new Error('Signature created in the future');
    }
    
    // Check expiration
    if (components.expires && components.expires < now) {
      throw new Error('Signature expired');
    }
    
    // Signature should not be too old (default 5 minutes)
    const maxAge = components.expires ? components.expires - components.created : 300;
    if (now - components.created > maxAge) {
      throw new Error('Signature too old');
    }
  }

  /**
   * Extract agent identity from network-specific headers
   */
  private extractAgentIdentity(headers: Record<string, string>, network: CardNetwork): Partial<AgentVerificationResult> {
    // Both networks use similar header patterns
    return {
      agentProvider: headers['x-agent-provider'] || headers['x-tap-agent-provider'],
      agentId: headers['x-agent-id'] || headers['x-tap-agent-id'],
      consumerId: headers['x-consumer-id'] || headers['x-tap-consumer-reference'],
      interactionType: (headers['x-interaction-type'] || headers['x-tap-intent']) as 'browse' | 'payment' | undefined
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Unified verifier works for both Visa and Mastercard
- [ ] Key caching implemented with 1-hour TTL
- [ ] Network auto-detection from key ID or headers
- [ ] RFC 9421 signature verification complete
- [ ] Timing validation (created, expires)
- [ ] Verification audit logged to database
- [ ] Unit tests with sample signatures from both networks
- [ ] 90%+ test coverage

**API Endpoint:**
- `POST /v1/cards/verify` — Verify Web Bot Auth signature (auto-detects network)

**Files to Create:**
- `packages/cards/src/web-bot-auth-verifier.ts`
- `packages/cards/src/web-bot-auth-verifier.test.ts`
- `apps/api/src/routes/cards/verify.ts`
- `apps/api/supabase/migrations/YYYYMMDD_card_agent_verification.sql`

**SDK Exposure:**
```typescript
// Unified verification
const result = await payos.cards.verify(request);
// { verified: true, network: 'visa', agentProvider: 'openai', ... }

// Middleware for Express/Hono
app.use('/checkout', payos.cards.verifyMiddleware());
```

---

### Story 53.3: Visa VIC Payment API Integration

**Points:** 8
**Priority:** P0
**Dependencies:** 53.2

**Description:**
Integrate with Visa Intelligent Commerce (VIC) APIs for payment instruction creation, credential retrieval, and commerce signal submission.

**VIC API Endpoints:**
- `POST /vic/v1/tokens/provision` — Provision agent-specific card token
- `POST /vic/v1/instructions` — Submit payment instruction
- `POST /vic/v1/credentials` — Retrieve payment credentials
- `POST /vic/v1/signals` — Submit commerce signals (post-purchase)

**Database Schema:**
```sql
-- Migration: YYYYMMDD_visa_vic.sql

-- Visa VIC agent tokens
CREATE TABLE visa_agent_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID REFERENCES agents(id),
  vic_token_id TEXT NOT NULL UNIQUE,
  token_status TEXT NOT NULL DEFAULT 'active',
  card_last_four TEXT,
  card_brand TEXT DEFAULT 'visa',
  card_expiry_month INT,
  card_expiry_year INT,
  single_transaction_limit DECIMAL(15,2),
  daily_limit DECIMAL(15,2),
  consumer_id TEXT,
  passkey_id TEXT,
  provisioned_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visa_agent_tokens_tenant ON visa_agent_tokens(tenant_id);
CREATE INDEX idx_visa_agent_tokens_agent ON visa_agent_tokens(agent_id);

-- Visa VIC payment instructions
CREATE TABLE visa_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  transfer_id UUID REFERENCES transfers(id),
  vic_instruction_id TEXT NOT NULL UNIQUE,
  vic_token_id TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  merchant_name TEXT,
  merchant_domain TEXT,
  merchant_category_code TEXT,
  instruction_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  authorization_code TEXT,
  network_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visa_instructions_tenant ON visa_instructions(tenant_id, created_at DESC);
CREATE INDEX idx_visa_instructions_transfer ON visa_instructions(transfer_id);
```

**Acceptance Criteria:**
- [ ] VIC token provisioning implemented
- [ ] Payment instruction creation working in sandbox
- [ ] Credential retrieval returns usable card token
- [ ] Commerce signals submitted after transactions
- [ ] Request signing (X-PAY-TOKEN) implemented
- [ ] Error handling for all VIC error codes
- [ ] Integration test: full Visa payment flow

**API Endpoints:**
- `POST /v1/cards/visa/instructions` — Create VIC payment instruction
- `GET /v1/cards/visa/instructions/:id/credentials` — Get payment credentials
- `POST /v1/cards/visa/instructions/:id/signals` — Submit commerce signal

**Files to Create:**
- `packages/cards/src/visa/vic-client.ts`
- `packages/cards/src/visa/vic-client.test.ts`
- `apps/api/src/routes/cards/visa.ts`
- `apps/api/supabase/migrations/YYYYMMDD_visa_vic.sql`

---

### Story 53.4: Mastercard Agent Pay API Integration

**Points:** 8
**Priority:** P0
**Dependencies:** 53.2

**Description:**
Integrate with Mastercard Agent Pay APIs for agentic token creation, Dynamic Token Verification Code generation, and transaction processing.

**Mastercard Agent Pay Components:**
- **Agent Registration** — Register and verify agents before transactions
- **Agentic Tokens** — Dynamic, cryptographically secure credentials
- **Dynamic Token Verification Code (DTVC)** — Formatted for standard checkout forms
- **Insight Tokens** — Consumer data with consent (personalization)

**Database Schema:**
```sql
-- Migration: YYYYMMDD_mastercard_agent_pay.sql

-- Mastercard registered agents
CREATE TABLE mastercard_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  agent_id UUID REFERENCES agents(id),
  mc_agent_id TEXT NOT NULL UNIQUE,
  agent_status TEXT NOT NULL DEFAULT 'pending',
  registration_date TIMESTAMPTZ,
  verification_date TIMESTAMPTZ,
  public_key TEXT,
  key_algorithm TEXT DEFAULT 'ed25519',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mastercard_agents_tenant ON mastercard_agents(tenant_id);
CREATE INDEX idx_mastercard_agents_payos ON mastercard_agents(agent_id);

-- Mastercard agentic tokens
CREATE TABLE mastercard_agentic_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mc_agent_id TEXT NOT NULL REFERENCES mastercard_agents(mc_agent_id),
  token_reference TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL DEFAULT 'payment',
  card_last_four TEXT,
  card_brand TEXT DEFAULT 'mastercard',
  transaction_limit DECIMAL(15,2),
  validity_window_seconds INT DEFAULT 300,
  consumer_reference TEXT,
  provisioned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mastercard_tokens_tenant ON mastercard_agentic_tokens(tenant_id);
CREATE INDEX idx_mastercard_tokens_agent ON mastercard_agentic_tokens(mc_agent_id);

-- Mastercard payment transactions
CREATE TABLE mastercard_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  transfer_id UUID REFERENCES transfers(id),
  token_reference TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  merchant_name TEXT,
  merchant_domain TEXT,
  dtvc TEXT,                              -- Dynamic Token Verification Code
  status TEXT NOT NULL DEFAULT 'pending',
  authorization_code TEXT,
  network_reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  authorized_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX idx_mastercard_transactions_tenant ON mastercard_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_mastercard_transactions_transfer ON mastercard_transactions(transfer_id);
```

**TypeScript Implementation:**
```typescript
// packages/cards/src/mastercard/agent-pay-client.ts

interface AgentPayConfig {
  consumerKey: string;
  keystorePath: string;
  keystorePassword: string;
  environment: 'sandbox' | 'production';
}

interface AgenticTokenRequest {
  agentId: string;
  consumerId: string;
  amount: number;
  currency: string;
  merchantDomain: string;
  validityWindowSeconds?: number;
}

interface AgenticTokenResponse {
  tokenReference: string;
  dtvc: string;                    // Dynamic Token Verification Code
  expiresAt: string;
  transactionControls: {
    maxAmount: number;
    validForSeconds: number;
    merchantDomain: string;
  };
}

export class MastercardAgentPayClient {
  private baseUrl: string;
  private config: AgentPayConfig;

  constructor(config: AgentPayConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'sandbox'
      ? 'https://sandbox.api.mastercard.com/agent-pay/v1'
      : 'https://api.mastercard.com/agent-pay/v1';
  }

  /**
   * Register an agent with Mastercard Agent Pay
   */
  async registerAgent(agent: {
    agentId: string;
    agentName: string;
    publicKey: string;
    agentProvider: string;
  }): Promise<{ mcAgentId: string; status: string }> {
    return this.request('POST', '/agents', agent);
  }

  /**
   * Create an agentic token for a payment
   */
  async createAgenticToken(request: AgenticTokenRequest): Promise<AgenticTokenResponse> {
    const response = await this.request('POST', '/tokens', {
      agentId: request.agentId,
      consumerReference: request.consumerId,
      transactionAmount: {
        value: request.amount,
        currency: request.currency
      },
      merchantDomain: request.merchantDomain,
      validityWindow: request.validityWindowSeconds || 300
    });

    return {
      tokenReference: response.tokenReference,
      dtvc: response.dynamicTokenVerificationCode,
      expiresAt: response.expiresAt,
      transactionControls: {
        maxAmount: response.controls.maxAmount,
        validForSeconds: response.controls.validityWindow,
        merchantDomain: response.controls.merchantDomain
      }
    };
  }

  /**
   * Get Dynamic Token Verification Code formatted for checkout
   * This can be submitted via standard card payment fields
   */
  async getDTVC(tokenReference: string): Promise<{
    cardNumber: string;      // Formatted for card number field
    expiryMonth: string;
    expiryYear: string;
    cvv: string;             // DTVC formatted as CVV
  }> {
    const response = await this.request('GET', `/tokens/${tokenReference}/checkout`);
    return {
      cardNumber: response.formattedPAN,
      expiryMonth: response.expiryMonth,
      expiryYear: response.expiryYear,
      cvv: response.dtvc
    };
  }

  /**
   * Submit transaction completion signal
   */
  async completeTransaction(tokenReference: string, transaction: {
    status: 'completed' | 'failed' | 'cancelled';
    authorizationCode?: string;
    actualAmount?: number;
    merchantTransactionId?: string;
    failureReason?: string;
  }): Promise<void> {
    await this.request('POST', `/tokens/${tokenReference}/complete`, transaction);
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    // Mastercard uses OAuth 1.0a with RSA-SHA256 signatures
    const url = `${this.baseUrl}${path}`;
    const oauthHeader = await this.generateOAuthHeader(method, url, body);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': oauthHeader
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new MastercardError(response.status, error.message || 'Agent Pay API error', error);
    }

    return response.json();
  }

  private async generateOAuthHeader(method: string, url: string, body?: any): Promise<string> {
    // Implement Mastercard OAuth 1.0a signing
    // Uses RSA-SHA256 with the p12 keystore
    // ... implementation details ...
  }
}
```

**Acceptance Criteria:**
- [ ] Agent registration with Mastercard implemented
- [ ] Agentic token creation working in sandbox
- [ ] DTVC generation for standard checkout forms
- [ ] OAuth 1.0a request signing implemented
- [ ] Transaction completion signals submitted
- [ ] Error handling for all Agent Pay error codes
- [ ] Integration test: full Mastercard payment flow

**API Endpoints:**
- `POST /v1/cards/mastercard/agents` — Register agent with Mastercard
- `POST /v1/cards/mastercard/tokens` — Create agentic token
- `GET /v1/cards/mastercard/tokens/:ref/checkout` — Get DTVC for checkout
- `POST /v1/cards/mastercard/tokens/:ref/complete` — Signal transaction completion

**Files to Create:**
- `packages/cards/src/mastercard/agent-pay-client.ts`
- `packages/cards/src/mastercard/agent-pay-client.test.ts`
- `packages/cards/src/mastercard/oauth-signer.ts`
- `apps/api/src/routes/cards/mastercard.ts`
- `apps/api/supabase/migrations/YYYYMMDD_mastercard_agent_pay.sql`

---

### Story 53.5: Unified Card Payment Interface

**Points:** 5
**Priority:** P0
**Dependencies:** 53.3, 53.4

**Description:**
Create a unified interface that abstracts both Visa VIC and Mastercard Agent Pay behind a single API. This allows callers to specify their preference or let PayOS auto-select based on card BIN.

**TypeScript Implementation:**
```typescript
// packages/cards/src/unified-card-client.ts

type CardNetwork = 'visa' | 'mastercard' | 'auto';

interface UnifiedPaymentRequest {
  network?: CardNetwork;              // 'auto' to detect from card
  agentId: string;
  amount: number;
  currency: string;
  merchant: {
    name: string;
    domain: string;
    categoryCode?: string;
  };
  consumerId?: string;
  cardBin?: string;                   // First 6 digits for auto-detection
}

interface UnifiedPaymentResponse {
  instructionId: string;
  network: 'visa' | 'mastercard';
  credentials: {
    cardToken?: string;               // Visa VTS token
    formattedPAN?: string;            // Mastercard formatted PAN
    expiryMonth: string;
    expiryYear: string;
    cvv?: string;                     // Mastercard DTVC
    cryptogram?: string;              // Visa 3DS cryptogram
  };
  transactionControls: {
    maxAmount: number;
    validForSeconds: number;
    merchantDomain: string;
  };
  expiresAt: string;
}

export class UnifiedCardClient {
  private visaClient: VICClient;
  private mastercardClient: MastercardAgentPayClient;

  /**
   * Create a payment instruction using the appropriate network
   */
  async createInstruction(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    const network = request.network === 'auto' 
      ? this.detectNetwork(request.cardBin)
      : request.network || 'visa';

    if (network === 'visa') {
      return this.createVisaInstruction(request);
    } else {
      return this.createMastercardInstruction(request);
    }
  }

  /**
   * Detect card network from BIN
   */
  private detectNetwork(bin?: string): 'visa' | 'mastercard' {
    if (!bin) return 'visa'; // Default
    
    // Visa BINs start with 4
    if (bin.startsWith('4')) return 'visa';
    
    // Mastercard BINs: 51-55, 2221-2720
    const prefix2 = parseInt(bin.slice(0, 2));
    const prefix4 = parseInt(bin.slice(0, 4));
    if ((prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720)) {
      return 'mastercard';
    }
    
    return 'visa'; // Default fallback
  }

  private async createVisaInstruction(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    const result = await this.visaClient.createPaymentInstruction({
      tokenId: request.agentId, // Map to VIC token
      amount: request.amount,
      currency: request.currency,
      merchantName: request.merchant.name,
      merchantDomain: request.merchant.domain,
      merchantCategoryCode: request.merchant.categoryCode
    });

    return {
      instructionId: result.instructionId,
      network: 'visa',
      credentials: {
        cardToken: result.credentials.cardToken,
        expiryMonth: result.credentials.expiryMonth,
        expiryYear: result.credentials.expiryYear,
        cryptogram: result.credentials.cryptogram
      },
      transactionControls: result.credentials.transactionControls,
      expiresAt: new Date(Date.now() + result.credentials.transactionControls.validFor * 1000).toISOString()
    };
  }

  private async createMastercardInstruction(request: UnifiedPaymentRequest): Promise<UnifiedPaymentResponse> {
    const token = await this.mastercardClient.createAgenticToken({
      agentId: request.agentId,
      consumerId: request.consumerId || 'anonymous',
      amount: request.amount,
      currency: request.currency,
      merchantDomain: request.merchant.domain
    });

    const checkout = await this.mastercardClient.getDTVC(token.tokenReference);

    return {
      instructionId: token.tokenReference,
      network: 'mastercard',
      credentials: {
        formattedPAN: checkout.cardNumber,
        expiryMonth: checkout.expiryMonth,
        expiryYear: checkout.expiryYear,
        cvv: checkout.cvv
      },
      transactionControls: token.transactionControls,
      expiresAt: token.expiresAt
    };
  }
}
```

**Acceptance Criteria:**
- [ ] Unified interface works for both networks
- [ ] Auto-detection from card BIN works correctly
- [ ] Response format normalized across networks
- [ ] Network preference can be specified
- [ ] Falls back gracefully if preferred network unavailable

**API Endpoint:**
- `POST /v1/cards/instructions` — Create instruction (auto-detect or specify network)

**Files to Create:**
- `packages/cards/src/unified-card-client.ts`
- `apps/api/src/routes/cards/instructions.ts`

---

### Story 53.6: Settlement Router - Card Rails Integration

**Points:** 8
**Priority:** P0
**Dependencies:** Epic 50 (Settlement Decoupling), 53.5

**Description:**
Extend the settlement decision engine to include both Visa and Mastercard as rail options alongside existing stablecoin and local rails.

**Settlement Decision Factors:**
| Factor | Visa | Mastercard | Circle USDC | Pix | SPEI |
|--------|------|------------|-------------|-----|------|
| **Fees** | 2.9% + $0.30 | 2.9% + $0.30 | ~1% | ~1% | ~1% |
| **Speed** | T+1 | T+1 | Instant | Instant | Instant |
| **Acceptance** | Universal | Universal | Limited | Brazil | Mexico |
| **Consumer Protection** | High | High | Low | Medium | Medium |
| **Chargeback Risk** | Yes | Yes | No | No | No |

**Enhanced Router Logic:**
```typescript
// apps/api/src/services/settlement-router.ts (enhanced)

interface SettlementContext {
  amount: number;
  currency: string;
  senderLocation?: string;
  recipientLocation?: string;
  merchantName?: string;
  merchantDomain?: string;
  acceptedMethods: SettlementRail[];
  agentProtocol?: string;
  cardBin?: string;                    // For Visa/MC detection
  preferredCardNetwork?: 'visa' | 'mastercard';
  prioritize?: 'cost' | 'speed' | 'consumer_protection';
}

type SettlementRail = 'visa' | 'mastercard' | 'circle_usdc' | 'circle_pix' | 'circle_spei';

interface SettlementDecision {
  selectedRail: SettlementRail;
  estimatedFees: number;
  estimatedFeePercent: number;
  settlementTime: 'instant' | 'same_day' | 't_plus_1' | 't_plus_2';
  consumerProtection: 'high' | 'medium' | 'low';
  chargebackRisk: boolean;
  reasoning: string[];
  alternatives: Array<{
    rail: SettlementRail;
    fees: number;
    reason: string;
  }>;
}

export class SettlementRouter {
  async route(context: SettlementContext): Promise<SettlementDecision> {
    const candidates = this.getCandidateRails(context);
    const scored = await this.scoreRails(candidates, context);
    const selected = scored[0];
    
    return {
      selectedRail: selected.rail,
      estimatedFees: selected.fees,
      estimatedFeePercent: (selected.fees / context.amount) * 100,
      settlementTime: selected.settlementTime,
      consumerProtection: selected.consumerProtection,
      chargebackRisk: selected.chargebackRisk,
      reasoning: selected.reasons,
      alternatives: scored.slice(1).map(s => ({
        rail: s.rail,
        fees: s.fees,
        reason: s.notSelectedReason || 'Lower score'
      }))
    };
  }

  private getCandidateRails(context: SettlementContext): SettlementRail[] {
    const candidates: SettlementRail[] = [];
    
    // Card networks
    if (context.acceptedMethods.some(m => ['visa', 'card'].includes(m))) {
      candidates.push('visa');
    }
    if (context.acceptedMethods.some(m => ['mastercard', 'card'].includes(m))) {
      candidates.push('mastercard');
    }
    
    // Crypto
    if (context.acceptedMethods.some(m => ['circle_usdc', 'usdc', 'crypto'].includes(m))) {
      candidates.push('circle_usdc');
    }
    
    // LATAM local rails
    if (context.recipientLocation === 'BR' && 
        context.acceptedMethods.some(m => ['circle_pix', 'pix'].includes(m))) {
      candidates.push('circle_pix');
    }
    if (context.recipientLocation === 'MX' && 
        context.acceptedMethods.some(m => ['circle_spei', 'spei'].includes(m))) {
      candidates.push('circle_spei');
    }
    
    return candidates;
  }

  private async estimateFees(rail: SettlementRail, context: SettlementContext): Promise<{
    fees: number;
    settlementTime: 'instant' | 'same_day' | 't_plus_1' | 't_plus_2';
    consumerProtection: 'high' | 'medium' | 'low';
    chargebackRisk: boolean;
    reasons: string[];
  }> {
    switch (rail) {
      case 'visa':
        return {
          fees: context.amount * 0.029 + 0.30,
          settlementTime: 't_plus_1',
          consumerProtection: 'high',
          chargebackRisk: true,
          reasons: [
            'Universal merchant acceptance',
            'Strong fraud protection via VisaNet',
            'Consumer dispute rights',
            'Trusted Agent Protocol verification'
          ]
        };
      
      case 'mastercard':
        return {
          fees: context.amount * 0.029 + 0.30,
          settlementTime: 't_plus_1',
          consumerProtection: 'high',
          chargebackRisk: true,
          reasons: [
            'Universal merchant acceptance',
            'Agent Pay fraud controls',
            'Consumer dispute rights',
            'Already live in LATAM (Dec 2025)'
          ]
        };
      
      case 'circle_usdc':
        return {
          fees: context.amount * 0.01,
          settlementTime: 'instant',
          consumerProtection: 'low',
          chargebackRisk: false,
          reasons: [
            'Lowest fees for crypto-accepting merchants',
            'Instant settlement',
            'No chargeback risk',
            'Settlement finality'
          ]
        };
      
      case 'circle_pix':
        return {
          fees: context.amount * 0.01,
          settlementTime: 'instant',
          consumerProtection: 'medium',
          chargebackRisk: false,
          reasons: [
            'Instant settlement in Brazil',
            'Local currency (BRL)',
            'Lower fees than card interchange',
            'BCB regulated'
          ]
        };
      
      case 'circle_spei':
        return {
          fees: context.amount * 0.01,
          settlementTime: 'instant',
          consumerProtection: 'medium',
          chargebackRisk: false,
          reasons: [
            'Instant settlement in Mexico',
            'Local currency (MXN)',
            'Lower fees than card interchange',
            'Banxico regulated'
          ]
        };
      
      default:
        throw new Error(`Unknown rail: ${rail}`);
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Router evaluates Visa, Mastercard, and existing rails
- [ ] Card network selection based on BIN when relevant
- [ ] Consumer protection factor in routing decisions
- [ ] Chargeback risk flagged in response
- [ ] LATAM rails preferred for BR/MX when cheaper
- [ ] Cost/speed/protection prioritization works
- [ ] Decision reasoning comprehensive
- [ ] Unit tests for all routing scenarios

**API Enhancement:**
```typescript
// POST /v1/settlements/route (enhanced)
{
  "amount": 150.00,
  "currency": "USD",
  "recipientLocation": "US",
  "acceptedMethods": ["card", "usdc"],
  "cardBin": "411111",
  "prioritize": "consumer_protection"
}

// Response
{
  "recommendedRail": "visa",
  "estimatedFees": "$4.65 (3.1%)",
  "settlementTime": "t_plus_1",
  "consumerProtection": "high",
  "chargebackRisk": true,
  "reasoning": [
    "Card BIN indicates Visa card",
    "Consumer protection prioritized",
    "Strong fraud protection via VisaNet",
    "TAP verification available"
  ],
  "alternatives": [
    { "rail": "circle_usdc", "fees": "$1.50", "reason": "Lower cost but less consumer protection" }
  ]
}
```

**Files to Modify:**
- `apps/api/src/services/settlement-router.ts`
- `apps/api/src/services/settlement-router.test.ts`

---

### Story 53.7: Card Network MCP Server Integration

**Points:** 5
**Priority:** P1
**Dependencies:** 53.5, 53.6

**Description:**
Add card network tools to the PayOS MCP server, enabling Claude and other LLM agents to use Visa and Mastercard payment capabilities.

**MCP Tools to Add:**
```typescript
const cardTools: Tool[] = [
  {
    name: 'cards_verify_agent',
    description: 'Verify a Web Bot Auth signature from a card network (Visa TAP or Mastercard Agent Pay)',
    inputSchema: {
      type: 'object',
      properties: {
        signatureInput: { type: 'string', description: 'Signature-Input header value' },
        signature: { type: 'string', description: 'Signature header value' },
        method: { type: 'string', description: 'HTTP method' },
        path: { type: 'string', description: 'Request path' }
      },
      required: ['signatureInput', 'signature', 'method', 'path']
    }
  },
  
  {
    name: 'cards_create_instruction',
    description: 'Create a card payment instruction. Auto-detects Visa or Mastercard from card BIN.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Payment amount' },
        currency: { type: 'string', description: 'Currency code (USD, EUR, etc.)' },
        merchantName: { type: 'string', description: 'Merchant name' },
        merchantDomain: { type: 'string', description: 'Merchant domain' },
        network: { 
          type: 'string', 
          enum: ['visa', 'mastercard', 'auto'],
          description: 'Card network (auto to detect from BIN)' 
        },
        cardBin: { type: 'string', description: 'First 6 digits of card for auto-detection' }
      },
      required: ['amount', 'merchantName', 'merchantDomain']
    }
  },
  
  {
    name: 'cards_complete_payment',
    description: 'Signal that a card payment was completed',
    inputSchema: {
      type: 'object',
      properties: {
        instructionId: { type: 'string', description: 'Instruction ID from cards_create_instruction' },
        status: { 
          type: 'string', 
          enum: ['completed', 'failed', 'cancelled'],
          description: 'Payment outcome' 
        },
        authorizationCode: { type: 'string', description: 'Authorization code if successful' }
      },
      required: ['instructionId', 'status']
    }
  },
  
  {
    name: 'settlement_route',
    description: 'Determine optimal settlement rail (Visa, Mastercard, USDC, Pix, SPEI)',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Payment amount' },
        currency: { type: 'string', description: 'Currency code' },
        recipientLocation: { type: 'string', description: 'Recipient country code' },
        acceptedMethods: {
          type: 'array',
          items: { type: 'string' },
          description: 'Accepted payment methods (card, pix, spei, usdc)'
        },
        prioritize: {
          type: 'string',
          enum: ['cost', 'speed', 'consumer_protection'],
          description: 'What to optimize for'
        }
      },
      required: ['amount', 'currency', 'acceptedMethods']
    }
  }
];
```

**Acceptance Criteria:**
- [ ] Card verification tool works for both networks
- [ ] Instruction creation handles network auto-detection
- [ ] Settlement routing includes card network comparison
- [ ] Error responses include helpful suggestions
- [ ] Integration test with Claude agent

**Files to Create/Modify:**
- `packages/mcp/src/tools/card-tools.ts`
- `packages/mcp/src/handlers/card-handlers.ts`
- `packages/mcp/src/index.ts` (register card tools)

---

### Story 53.8: Card Network Dashboard Integration

**Points:** 8
**Priority:** P1
**Dependencies:** 53.5

**Description:**
Add card network management UI to the PayOS dashboard for configuring Visa and Mastercard integrations, viewing card transactions, and monitoring rail distribution.

**UI Components:**

1. **Settings → Integrations → Card Networks**
   - Tabs: Visa | Mastercard
   - Connection status (sandbox/production)
   - API credentials configuration
   - Test connection button
   - Enable/disable as settlement option

2. **Settings → Integrations → Card Networks → Visa**
   - VIC API key configuration
   - TAP key directory status
   - Agent registration status

3. **Settings → Integrations → Card Networks → Mastercard**
   - OAuth credentials configuration
   - Agent Pay registration status
   - Registered agents list

4. **Transactions → Filter by Rail**
   - Enhanced filter: All | Visa | Mastercard | USDC | Pix | SPEI
   - Rail icon badges on transaction rows
   - Network logo display

5. **Analytics → Settlement Distribution**
   - Pie chart: Volume by rail (including Visa/MC breakdown)
   - Cost comparison: Actual fees by rail
   - Consumer protection coverage chart

**Acceptance Criteria:**
- [ ] Visa settings page with VIC configuration
- [ ] Mastercard settings page with Agent Pay configuration
- [ ] Connection test for both networks
- [ ] Transaction filtering by card network
- [ ] Settlement rail badges distinguish Visa vs Mastercard
- [ ] Analytics show card network breakdown
- [ ] Responsive design

**Files to Create:**
- `apps/dashboard/app/(dashboard)/settings/integrations/cards/page.tsx`
- `apps/dashboard/app/(dashboard)/settings/integrations/cards/visa/page.tsx`
- `apps/dashboard/app/(dashboard)/settings/integrations/cards/mastercard/page.tsx`
- `apps/dashboard/components/integrations/CardNetworkSettings.tsx`
- `apps/dashboard/components/integrations/VisaVICSettings.tsx`
- `apps/dashboard/components/integrations/MastercardAgentPaySettings.tsx`
- `apps/dashboard/components/transactions/CardNetworkBadge.tsx`

---

### Story 53.9: LATAM Card Network Optimization

**Points:** 5
**Priority:** P1
**Dependencies:** 53.6

**Description:**
Implement LATAM-specific optimizations leveraging Mastercard's early launch in the region and preparing for Visa's 2026 expansion.

**LATAM Context:**
- **Mastercard** launched Agent Pay in LATAM Dec 2025 with partners: Getnet, Davivienda, MagaluPay, Bemobi, Evertec, Yuno
- **Visa** VIC expanding to LATAM in 2026
- PayOS already has Pix/SPEI via Circle — card networks complement for universal acceptance

**Optimization Logic:**
```typescript
// LATAM-specific routing enhancements

interface LATAMRoutingContext extends SettlementContext {
  merchantProcessor?: string;    // e.g., 'getnet', 'evertec'
  issuerCountry?: string;        // Consumer's card issuer country
}

function getLATAMRecommendation(context: LATAMRoutingContext): SettlementRail {
  // If merchant uses Mastercard Agent Pay-enabled processor in LATAM
  const mcEnabledProcessors = ['getnet', 'davivienda', 'evertec', 'magalupay', 'bemobi', 'yuno'];
  if (mcEnabledProcessors.includes(context.merchantProcessor?.toLowerCase() || '')) {
    // Mastercard preferred — already live
    if (context.acceptedMethods.includes('mastercard')) {
      return 'mastercard';
    }
  }
  
  // For Brazil recipients, compare Pix vs card
  if (context.recipientLocation === 'BR') {
    // Pix is cheaper and instant, but cards have better consumer protection
    if (context.prioritize === 'cost') return 'circle_pix';
    if (context.prioritize === 'consumer_protection') return context.preferredCardNetwork || 'mastercard';
  }
  
  // For Mexico recipients, compare SPEI vs card
  if (context.recipientLocation === 'MX') {
    if (context.prioritize === 'cost') return 'circle_spei';
    if (context.prioritize === 'consumer_protection') return context.preferredCardNetwork || 'mastercard';
  }
  
  // Default: use available card network
  return context.preferredCardNetwork || 'visa';
}
```

**Acceptance Criteria:**
- [ ] Routing recognizes Mastercard-enabled LATAM processors
- [ ] Mastercard preferred in LATAM when available
- [ ] Card vs local rail tradeoffs documented
- [ ] World Cup 2026 demo scenario supported
- [ ] Unit tests for LATAM routing scenarios

**Files to Modify:**
- `apps/api/src/services/settlement-router.ts` (add LATAM logic)
- `apps/api/src/services/settlement-router.test.ts` (LATAM tests)

---

### Story 53.10: B2C Multi-Rail Checkout Widget

**Points:** 6
**Priority:** P2
**Dependencies:** 53.5, 53.6

**Description:**
Build an embeddable checkout widget that presents all available payment options (Visa, Mastercard, Pix, SPEI, USDC) and routes to the optimal rail.

**Widget Features:**
- Auto-detect customer location for Pix/SPEI eligibility
- Show estimated fees for each option
- Handle card network verification (TAP/Agent Pay)
- Card BIN detection for network routing
- Unified completion callback

**Implementation:**
```typescript
// packages/checkout-widget/src/PayOSCheckout.tsx

interface CheckoutConfig {
  partnerId: string;
  amount: number;
  currency: string;
  merchantName: string;
  acceptedMethods: Array<'card' | 'pix' | 'spei' | 'usdc'>;
  onComplete: (result: CheckoutResult) => void;
  onError: (error: CheckoutError) => void;
  theme?: 'light' | 'dark' | 'auto';
}

interface CheckoutResult {
  rail: 'visa' | 'mastercard' | 'circle_pix' | 'circle_spei' | 'circle_usdc';
  transactionId: string;
  amount: number;
  fees: number;
}

export function PayOSCheckout(config: CheckoutConfig) {
  return (
    <CheckoutProvider config={config}>
      <CheckoutContainer>
        <PaymentMethodSelector />
        <CardNetworkIndicator />  {/* Shows Visa/MC logo based on BIN */}
        <FeeEstimate />
        <SubmitButton />
      </CheckoutContainer>
    </CheckoutProvider>
  );
}
```

**Acceptance Criteria:**
- [ ] Widget renders card options with network logos
- [ ] BIN detection shows correct network logo
- [ ] Location detection for Pix/SPEI eligibility
- [ ] Fee comparison shown per method
- [ ] Unified completion callback
- [ ] Embeddable via script tag
- [ ] React component export

**Files to Create:**
- `packages/checkout-widget/` (new package)

---

### Story 53.11: Card Network Integration Tests & Documentation

**Points:** 5
**Priority:** P1
**Dependencies:** 53.1-53.9

**Description:**
Comprehensive test suite and documentation for both Visa and Mastercard integrations.

**Test Scenarios:**

**Web Bot Auth Verification:**
1. Valid Visa TAP signature → verified
2. Valid Mastercard Agent Pay signature → verified
3. Expired signature → rejected
4. Invalid key ID → rejected
5. Replay attack (reused nonce) → rejected

**Visa VIC:**
1. Token provisioning → success
2. Payment instruction creation → success
3. Credential retrieval → valid token
4. Commerce signal → accepted
5. Invalid merchant → appropriate error

**Mastercard Agent Pay:**
1. Agent registration → success
2. Agentic token creation → success
3. DTVC generation → valid format
4. Transaction completion → accepted
5. Expired token → appropriate error

**Settlement Routing:**
1. Card-only merchant → selects available network
2. Multi-rail merchant (card + pix) → cost optimization
3. LATAM merchant with MC processor → prefers Mastercard
4. Consumer protection priority → selects card
5. Cost priority in Brazil → selects Pix

**Documentation:**
- Integration guide covering both networks
- API reference for unified card endpoints
- MCP tool usage examples
- Dashboard configuration guide
- LATAM-specific guidance
- Troubleshooting guide

**Acceptance Criteria:**
- [ ] Unit tests for WebBotAuthVerifier (95%+ coverage)
- [ ] Unit tests for VICClient (90%+ coverage)
- [ ] Unit tests for MastercardAgentPayClient (90%+ coverage)
- [ ] Integration tests against both sandboxes
- [ ] Settlement router tests for all scenarios
- [ ] Developer documentation complete
- [ ] Example code for common use cases
- [ ] LATAM demo scenario documented

**Files to Create:**
- `docs/integrations/card-networks.md`
- `docs/integrations/card-networks-api-reference.md`
- `docs/integrations/card-networks-latam.md`
- `packages/cards/src/**/*.test.ts`

---

## Epic 53 Summary

| Story | Points | Priority | Status | Description |
|-------|--------|----------|--------|-------------|
| **Foundation** | | | | |
| 53.1 Developer Accounts Setup | 3 | P0 | 🆕 Pending | Both Visa & Mastercard sandbox access |
| 53.2 Unified Web Bot Auth | 8 | P0 | 🆕 Pending | Single verifier for both networks |
| 53.3 Visa VIC APIs | 8 | P0 | 🆕 Pending | VIC payment instructions & tokens |
| 53.4 Mastercard Agent Pay APIs | 8 | P0 | 🆕 Pending | Agent Pay tokens & DTVC |
| 53.5 Unified Card Interface | 5 | P0 | 🆕 Pending | Abstract both networks |
| 53.6 Settlement Router | 8 | P0 | 🆕 Pending | Add card rails to routing |
| **Integration** | | | | |
| 53.7 MCP Server | 5 | P1 | 🆕 Pending | Card tools for Claude |
| 53.8 Dashboard | 8 | P1 | 🆕 Pending | Card network settings UI |
| 53.9 LATAM Optimization | 5 | P1 | 🆕 Pending | MC LATAM advantage |
| **B2C** | | | | |
| 53.10 Checkout Widget | 6 | P2 | 🆕 Pending | Multi-rail checkout |
| **Quality** | | | | |
| 53.11 Tests & Docs | 5 | P1 | 🆕 Pending | Both networks tested |
| **Total** | **62** | | **0/11 Complete** | |

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Epic 27: Settlement | ✅ Complete | Settlement service integration |
| Epic 48: Connected Accounts | 🚧 In Progress | Card networks as connected handlers |
| Epic 50: Settlement Decoupling | 🚧 In Progress | Settlement trigger rules |
| Epic 36: SDK | ✅ Complete | `cards` module added to @sly/sdk |

---

## Technical Resources

### Visa
- **Developer Portal:** developer.visa.com
- **TAP GitHub:** github.com/visa/trusted-agent-protocol
- **TAP Specification:** developer.visa.com/capabilities/trusted-agent-protocol
- **VIC Documentation:** developer.visa.com/capabilities/vic

### Mastercard
- **Developer Portal:** developer.mastercard.com
- **Agent Pay Docs:** developer.mastercard.com/mastercard-checkout-solutions/documentation/use-cases/agent-pay/
- **Agent Toolkit (MCP):** Available on Mastercard Developers
- **OAuth 1.0a Guide:** developer.mastercard.com/platform/documentation/security-and-authentication/

### Shared Standards
- **Web Bot Auth:** Cloudflare blog.cloudflare.com/secure-agentic-commerce/
- **HTTP Message Signatures:** RFC 9421
- **FIDO Payments Working Group:** Verifiable credentials for payments

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Sandbox access delays | High | Medium | Apply for both immediately; mock in dev |
| API differences between networks | Medium | High | Unified abstraction layer (Story 53.5) |
| OAuth 1.0a complexity (MC) | Medium | Medium | Use official Mastercard SDK/library |
| Production approval timeline | High | Medium | Build sandbox-first; document compliance |
| LATAM Visa timeline uncertainty | Low | Medium | Mastercard already live; Visa as bonus |

---

## Success Criteria

1. **Technical:** Both Visa and Mastercard payment flows work end-to-end in sandbox
2. **Unified:** Single SDK interface abstracts network differences
3. **Routing:** Settlement router correctly evaluates 5 rails (Visa, MC, USDC, Pix, SPEI)
4. **LATAM:** Can demo Mastercard Agent Pay with LATAM processors
5. **Accelerator:** Demonstrates true multi-rail orchestration capability

---

## Open Questions

1. **Network partnerships:** Pursue formal partner status with both? (Agent Enabler for Visa, similar for MC)
2. **Production timeline:** When do we need production access? (Post-accelerator?)
3. **American Express:** Should we add Amex (also adopting Web Bot Auth)?
4. **Discover/JCB:** Future expansion to other networks?

---

*Created: January 21, 2026*
*Last Updated: January 21, 2026*
