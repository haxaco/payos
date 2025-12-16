# PayOS PoC — Product Requirements Document (PRD)

**Version:** 1.3  
**Date:** December 16, 2025  
**Status:** P1 Features Complete, Planning Phase 2 Enhancements  

---

## Executive Summary

PayOS is a B2B stablecoin payout operating system for LATAM. This PRD covers the PoC implementation that demonstrates:

1. **Core payment infrastructure** — Quotes, transfers, internal movements
2. **Agent system** — AI agents as first-class actors with KYA verification
3. **Money streaming** — Continuous per-second payments
4. **Partner dashboard** — Full UI for managing accounts, agents, and payments

### Implementation Phases

| Phase | Focus | External Services | Timeline |
|-------|-------|-------------------|----------|
| **Phase 1** | Full PoC with mocked externals | Supabase only | ✅ Complete |
| **Phase 1.5** | AI visibility & demo polish | Supabase only | Current |
| **Phase 2** | PSP table stakes (refunds, subscriptions, exports) | Supabase only | Next |
| **Phase 3** | Circle sandbox integration | + Circle Sandbox | Future |
| **Phase 4** | On-chain streaming | + Superfluid Testnet | Future |

**Phase 1 is complete.** Phase 1.5 makes the AI-native story visible. Phase 2 adds features fintechs expect (refunds, recurring payments, exports). Phases 3-4 add blockchain "realness."

**Tech Stack:** Next.js, TypeScript, Supabase (Postgres), Hono, Vercel, Railway  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [External Services & Phasing](#3-external-services--phasing)
4. [Data Models](#4-data-models)
5. [Epic 1: Foundation & Multi-Tenancy](#epic-1-foundation--multi-tenancy)
6. [Epic 2: Account System](#epic-2-account-system)
7. [Epic 3: Agent System & KYA](#epic-3-agent-system--kya)
8. [Epic 4: Transfers & Payments](#epic-4-transfers--payments)
9. [Epic 5: Money Streaming](#epic-5-money-streaming)
10. [Epic 6: Reports & Documents](#epic-6-reports--documents)
11. [Epic 7: Dashboard UI](#epic-7-dashboard-ui)
12. [Epic 8: AI Visibility & Agent Intelligence](#epic-8-ai-visibility--agent-intelligence)
13. [Epic 9: Demo Polish & Missing Features](#epic-9-demo-polish--missing-features)
14. [Epic 10: PSP Table Stakes Features](#epic-10-psp-table-stakes-features)
15. [Epic 11: Authentication & User Management](#epic-11-authentication--user-management)
16. [Epic 12: Client-Side Caching & Data Management](#epic-12-client-side-caching--data-management)
17. [Implementation Schedule](#implementation-schedule)
18. [API Reference](#api-reference)
19. [Testing & Demo Scenarios](#testing--demo-scenarios)

---

## 1. Product Overview

### 1.1 What is PayOS?

PayOS enables fintechs to offer stablecoin-powered payouts through white-label infrastructure. Partners integrate via API, their customers see a seamless experience.

### 1.2 Core Concepts

| Concept | Description |
|---------|-------------|
| **Tenant** | A fintech partner using PayOS |
| **Account** | Person or Business entity that holds funds |
| **Agent** | AI actor registered under an Account |
| **Transfer** | One-time movement of funds |
| **Stream** | Continuous per-second payment flow |
| **KYC/KYB** | Identity verification for persons/businesses |
| **KYA** | Identity verification for AI agents |

### 1.3 Key Differentiators

1. **KYA Framework** — Agents have formal verification tiers
2. **Money Streaming** — Real-time payments, not just batches
3. **Agent-Native** — Agents can initiate and manage payments
4. **LATAM Focus** — Built for Pix, SPEI, local rails

### 1.4 PoC Success Criteria

- [ ] Partner can create accounts (Person/Business)
- [ ] Partner can register agents under accounts
- [ ] User or Agent can create transfers
- [ ] User or Agent can create and manage streams
- [ ] Transfers settle through mock payout provider
- [ ] Stream balances update in real-time
- [ ] Full dashboard UI is functional
- [ ] All operations < 500ms latency

---

## 2. Technical Architecture

### 2.1 Stack Overview

**Architecture: Monorepo with Separate Services**

The UI (Dashboard) and API are separate applications that can be deployed independently. They share types and utilities through internal packages.

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD (UI)                          │
│  Next.js 14 + React + TypeScript + Tailwind                 │
│  Deployed on Vercel                                         │
│  Port: 3000 (dev)                                           │
│  Calls API via NEXT_PUBLIC_API_URL                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                     API SERVER                               │
│  Node.js + Hono + TypeScript                                │
│  Deployed on Railway / Render / Fly.io                      │
│  Port: 4000 (dev)                                           │
│  /v1/* endpoints                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE                                 │
│  Supabase (Postgres + RLS + Auth)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│  Circle (mock) │ Payout Provider (mock) │ Superfluid        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Monorepo Structure

Using **Turborepo** for monorepo management with **pnpm** workspaces.

```
payos/
├── apps/
│   ├── dashboard/                # Next.js Dashboard UI
│   │   ├── app/
│   │   │   ├── (dashboard)/      # Authenticated routes
│   │   │   │   ├── accounts/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── agents/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── transactions/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── streams/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── treasury/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/               # Shadcn components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── DashboardLayout.tsx
│   │   │   ├── accounts/
│   │   │   │   ├── AccountsTable.tsx
│   │   │   │   ├── AccountDetail.tsx
│   │   │   │   ├── AccountOverview.tsx
│   │   │   │   ├── AccountTransactions.tsx
│   │   │   │   ├── AccountStreams.tsx
│   │   │   │   ├── AccountAgents.tsx
│   │   │   │   └── AccountDocuments.tsx
│   │   │   ├── agents/
│   │   │   │   ├── AgentsTable.tsx
│   │   │   │   ├── AgentDetail.tsx
│   │   │   │   ├── AgentOverview.tsx
│   │   │   │   ├── AgentStreams.tsx
│   │   │   │   ├── AgentAuthentication.tsx
│   │   │   │   ├── AgentKYA.tsx
│   │   │   │   └── AgentActivity.tsx
│   │   │   ├── streams/
│   │   │   │   ├── StreamsTable.tsx
│   │   │   │   ├── StreamHealthBadge.tsx
│   │   │   │   ├── StreamRunway.tsx
│   │   │   │   └── BalanceBreakdown.tsx
│   │   │   ├── payments/
│   │   │   │   ├── NewPaymentModal.tsx
│   │   │   │   └── TransactionsTable.tsx
│   │   │   └── reports/
│   │   │       ├── ReportsPage.tsx
│   │   │       ├── DocumentsTab.tsx
│   │   │       └── ExportModal.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts     # API client wrapper
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── use-accounts.ts
│   │   │   ├── use-agents.ts
│   │   │   ├── use-streams.ts
│   │   │   └── use-transfers.ts
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   └── api/                      # Hono API Server
│       ├── src/
│       │   ├── index.ts          # Entry point
│       │   ├── app.ts            # Hono app setup
│       │   ├── routes/
│       │   │   ├── index.ts      # Route aggregator
│       │   │   ├── accounts.ts
│       │   │   ├── agents.ts
│       │   │   ├── transfers.ts
│       │   │   ├── streams.ts
│       │   │   ├── quotes.ts
│       │   │   └── reports.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts       # API key / OAuth validation
│       │   │   ├── tenant.ts     # Tenant resolution
│       │   │   ├── error.ts      # Error handling
│       │   │   └── logging.ts    # Request logging
│       │   ├── services/
│       │   │   ├── accounts.ts
│       │   │   ├── agents.ts
│       │   │   ├── transfers.ts
│       │   │   ├── streams.ts
│       │   │   ├── balances.ts
│       │   │   ├── limits.ts
│       │   │   └── reports.ts
│       │   ├── providers/
│       │   │   ├── circle/
│       │   │   ├── payout/
│       │   │   └── superfluid/
│       │   ├── workers/
│       │   │   ├── transfer-processor.ts
│       │   │   ├── stream-health-monitor.ts
│       │   │   └── usage-settlement.ts
│       │   ├── db/
│       │   │   ├── client.ts     # Supabase client
│       │   │   └── queries/      # Typed queries
│       │   └── utils/
│       │       ├── errors.ts
│       │       ├── response.ts
│       │       └── validation.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   ├── types/                    # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── account.ts
│   │   │   ├── agent.ts
│   │   │   ├── transfer.ts
│   │   │   ├── stream.ts
│   │   │   ├── api.ts            # API request/response types
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                    # Shared utilities
│   │   ├── src/
│   │   │   ├── currency.ts
│   │   │   ├── dates.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── db/                       # Database schema & migrations
│       ├── migrations/
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_agents.sql
│       │   ├── 003_streams.sql
│       │   └── 004_reports.sql
│       ├── seed.sql
│       ├── package.json
│       └── README.md
│
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml           # Workspace config
├── package.json                  # Root package.json
├── .env.example                  # Environment template
└── README.md
```

### 2.3 Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

### 2.4 Package Configurations

```json
// apps/dashboard/package.json
{
  "name": "@payos/dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@payos/types": "workspace:*",
    "@payos/utils": "workspace:*",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0"
  }
}
```

```json
// apps/api/package.json
{
  "name": "@payos/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@payos/types": "workspace:*",
    "@payos/utils": "workspace:*",
    "@supabase/supabase-js": "^2.38.0",
    "@hono/node-server": "^1.3.0",
    "hono": "^3.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "tsup": "^8.0.0"
  }
}
```

```json
// packages/types/package.json
{
  "name": "@payos/types",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  }
}
```

### 2.5 Environment Variables

```env
# Root .env.example
# Copy to .env and fill in values
# Each app will read from root .env or their own .env.local

# ============================================
# DATABASE (used by API)
# ============================================
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ============================================
# API SERVER (apps/api)
# ============================================
API_PORT=4000
API_HOST=0.0.0.0
NODE_ENV=development

# CORS - Dashboard origin(s)
CORS_ORIGINS=http://localhost:3000,https://dashboard.payos.dev

# External Services
CIRCLE_API_KEY=
CIRCLE_API_URL=https://api-sandbox.circle.com

# Superfluid (Base Sepolia)
SUPERFLUID_HOST_ADDRESS=0x...
SUPERFLUID_USDC_ADDRESS=0x...
SUPERFLUID_USDCX_ADDRESS=0x...

# ============================================
# DASHBOARD (apps/dashboard)
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.6 API Client (Dashboard)

The dashboard communicates with the API server via a typed client.

```typescript
// apps/dashboard/lib/api-client.ts
import type {
  Account,
  Agent,
  Transfer,
  Stream,
  ApiResponse,
  PaginatedResponse,
  CreateAccountRequest,
  CreateAgentRequest,
  CreateTransferRequest,
  CreateStreamRequest,
} from '@payos/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(error.message || 'Request failed', response.status, error);
    }

    return response.json();
  }

  // ============================================
  // ACCOUNTS
  // ============================================
  
  async getAccounts(params?: {
    type?: 'person' | 'business';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Account>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return this.request(`/v1/accounts${query ? `?${query}` : ''}`);
  }

  async getAccount(id: string): Promise<ApiResponse<Account>> {
    return this.request(`/v1/accounts/${id}`);
  }

  async createAccount(data: CreateAccountRequest): Promise<ApiResponse<Account>> {
    return this.request('/v1/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAccountBalance(id: string): Promise<ApiResponse<AccountBalance>> {
    return this.request(`/v1/accounts/${id}/balances`);
  }

  async getAccountAgents(id: string): Promise<ApiResponse<Agent[]>> {
    return this.request(`/v1/accounts/${id}/agents`);
  }

  async getAccountStreams(id: string): Promise<ApiResponse<Stream[]>> {
    return this.request(`/v1/accounts/${id}/streams`);
  }

  // ============================================
  // AGENTS
  // ============================================

  async getAgents(params?: {
    search?: string;
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<Agent>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    
    const query = searchParams.toString();
    return this.request(`/v1/agents${query ? `?${query}` : ''}`);
  }

  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    return this.request(`/v1/agents/${id}`);
  }

  async createAgent(data: CreateAgentRequest): Promise<ApiResponse<Agent>> {
    return this.request('/v1/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentStreams(id: string): Promise<ApiResponse<Stream[]>> {
    return this.request(`/v1/agents/${id}/streams`);
  }

  async suspendAgent(id: string): Promise<ApiResponse<Agent>> {
    return this.request(`/v1/agents/${id}/suspend`, { method: 'POST' });
  }

  async activateAgent(id: string): Promise<ApiResponse<Agent>> {
    return this.request(`/v1/agents/${id}/activate`, { method: 'POST' });
  }

  // ============================================
  // TRANSFERS
  // ============================================

  async getTransfers(params?: {
    status?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
  }): Promise<PaginatedResponse<Transfer>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.page) searchParams.set('page', String(params.page));
    
    const query = searchParams.toString();
    return this.request(`/v1/transfers${query ? `?${query}` : ''}`);
  }

  async getTransfer(id: string): Promise<ApiResponse<Transfer>> {
    return this.request(`/v1/transfers/${id}`);
  }

  async createTransfer(
    data: CreateTransferRequest,
    idempotencyKey?: string
  ): Promise<ApiResponse<Transfer>> {
    const headers: HeadersInit = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    return this.request('/v1/transfers', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  async createInternalTransfer(
    data: { fromAccountId: string; toAccountId: string; amount: number; description?: string },
    idempotencyKey?: string
  ): Promise<ApiResponse<Transfer>> {
    const headers: HeadersInit = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    return this.request('/v1/internal-transfers', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // QUOTES
  // ============================================

  async getQuote(data: {
    fromCurrency: string;
    toCurrency: string;
    amount: number;
  }): Promise<ApiResponse<Quote>> {
    return this.request('/v1/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // STREAMS
  // ============================================

  async getStreams(params?: {
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<Stream>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    
    const query = searchParams.toString();
    return this.request(`/v1/streams${query ? `?${query}` : ''}`);
  }

  async getStream(id: string): Promise<ApiResponse<Stream>> {
    return this.request(`/v1/streams/${id}`);
  }

  async createStream(data: CreateStreamRequest): Promise<ApiResponse<Stream>> {
    return this.request('/v1/streams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async pauseStream(id: string): Promise<ApiResponse<Stream>> {
    return this.request(`/v1/streams/${id}/pause`, { method: 'POST' });
  }

  async resumeStream(id: string): Promise<ApiResponse<Stream>> {
    return this.request(`/v1/streams/${id}/resume`, { method: 'POST' });
  }

  async cancelStream(id: string): Promise<ApiResponse<Stream>> {
    return this.request(`/v1/streams/${id}/cancel`, { method: 'POST' });
  }

  async topUpStream(id: string, amount: number): Promise<ApiResponse<Stream>> {
    return this.request(`/v1/streams/${id}/top-up`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async withdrawFromStream(id: string, amount?: number): Promise<ApiResponse<Transfer>> {
    return this.request(`/v1/streams/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // ============================================
  // REPORTS
  // ============================================

  async getReports(params?: { accountId?: string }): Promise<ApiResponse<Report[]>> {
    const searchParams = new URLSearchParams();
    if (params?.accountId) searchParams.set('accountId', params.accountId);
    
    const query = searchParams.toString();
    return this.request(`/v1/reports${query ? `?${query}` : ''}`);
  }

  async generateReport(data: {
    type: 'statement' | 'transactions' | 'streams';
    accountId?: string;
    periodStart: string;
    periodEnd: string;
    format: 'pdf' | 'csv' | 'json';
  }): Promise<ApiResponse<Report>> {
    return this.request('/v1/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### 2.7 React Query Hooks (Dashboard)

```typescript
// apps/dashboard/hooks/use-accounts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useAccounts(params?: { type?: string; search?: string }) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => apiClient.getAccounts(params),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => apiClient.getAccount(id),
    enabled: !!id,
  });
}

export function useAccountBalance(id: string) {
  return useQuery({
    queryKey: ['accounts', id, 'balance'],
    queryFn: () => apiClient.getAccountBalance(id),
    enabled: !!id,
    refetchInterval: 30000, // Refresh every 30s for streaming balances
  });
}

export function useAccountAgents(id: string) {
  return useQuery({
    queryKey: ['accounts', id, 'agents'],
    queryFn: () => apiClient.getAccountAgents(id),
    enabled: !!id,
  });
}

export function useAccountStreams(id: string) {
  return useQuery({
    queryKey: ['accounts', id, 'streams'],
    queryFn: () => apiClient.getAccountStreams(id),
    enabled: !!id,
    refetchInterval: 10000, // Refresh every 10s for stream updates
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createAccount.bind(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
```

```typescript
// apps/dashboard/hooks/use-streams.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useStreams(params?: { status?: string }) {
  return useQuery({
    queryKey: ['streams', params],
    queryFn: () => apiClient.getStreams(params),
  });
}

export function useStream(id: string) {
  return useQuery({
    queryKey: ['streams', id],
    queryFn: () => apiClient.getStream(id),
    enabled: !!id,
    refetchInterval: 10000, // Keep stream data fresh
  });
}

export function useCreateStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createStream.bind(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Balance changed
    },
  });
}

export function usePauseStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.pauseStream(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['streams', id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    },
  });
}

export function useTopUpStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => 
      apiClient.topUpStream(id, amount),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['streams', id] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Balance changed
    },
  });
}
```

### 2.8 API Server Setup (Hono)

```typescript
// apps/api/src/app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

import accountsRouter from './routes/accounts';
import agentsRouter from './routes/agents';
import transfersRouter from './routes/transfers';
import internalTransfersRouter from './routes/internal-transfers';
import streamsRouter from './routes/streams';
import quotesRouter from './routes/quotes';
import reportsRouter from './routes/reports';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
}));

// Health check (no auth)
app.get('/health', (c) => c.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  version: '0.1.0'
}));

// API v1 routes (with auth)
const v1 = new Hono();
v1.use('*', authMiddleware);

v1.route('/accounts', accountsRouter);
v1.route('/agents', agentsRouter);
v1.route('/transfers', transfersRouter);
v1.route('/internal-transfers', internalTransfersRouter);
v1.route('/streams', streamsRouter);
v1.route('/quotes', quotesRouter);
v1.route('/reports', reportsRouter);

app.route('/v1', v1);

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
```

```typescript
// apps/api/src/index.ts
import { serve } from '@hono/node-server';
import app from './app';

const port = parseInt(process.env.API_PORT || '4000');
const host = process.env.API_HOST || '0.0.0.0';

console.log(`
╔════════════════════════════════════════════╗
║           PayOS API Server                 ║
╠════════════════════════════════════════════╣
║  🚀 Starting on http://${host}:${port}         ║
║  📚 Health: http://${host}:${port}/health      ║
║  🔒 Environment: ${process.env.NODE_ENV || 'development'}           ║
╚════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});
```

```typescript
// apps/api/src/middleware/auth.ts
import { Context, Next } from 'hono';
import { createClient } from '../db/client';

export interface RequestContext {
  tenantId: string;
  actorType: 'user' | 'agent';
  actorId: string;
  actorName: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    ctx: RequestContext;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }
  
  const token = authHeader.slice(7);
  const supabase = createClient();
  
  // Partner API key (pk_test_xxx)
  if (token.startsWith('pk_')) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('api_key', token)
      .eq('status', 'active')
      .single();
    
    if (error || !tenant) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    
    c.set('ctx', {
      tenantId: tenant.id,
      actorType: 'user',
      actorId: 'api_user',
      actorName: 'API User',
    });
    
    return next();
  }
  
  // Agent token (agent_xxx)
  if (token.startsWith('agent_')) {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, tenant_id, status, kya_tier')
      .eq('auth_client_id', token)
      .single();
    
    if (error || !agent) {
      return c.json({ error: 'Invalid agent token' }, 401);
    }
    
    if (agent.status !== 'active') {
      return c.json({ error: 'Agent is not active', status: agent.status }, 403);
    }
    
    c.set('ctx', {
      tenantId: agent.tenant_id,
      actorType: 'agent',
      actorId: agent.id,
      actorName: agent.name,
    });
    
    return next();
  }
  
  return c.json({ error: 'Invalid token format' }, 401);
}
```

### 2.9 Development Workflow

```bash
# Initial setup
git clone <repo>
cd payos
pnpm install

# Start everything in dev mode (runs both apps)
pnpm dev

# Or run specific apps
pnpm --filter @payos/dashboard dev    # Dashboard on :3000
pnpm --filter @payos/api dev          # API on :4000

# Build all packages and apps
pnpm build

# Type check everything
pnpm typecheck

# Lint everything
pnpm lint

# Database operations
pnpm --filter @payos/db migrate       # Run migrations
pnpm --filter @payos/db seed          # Seed data

# Add a dependency to a specific package
pnpm --filter @payos/dashboard add zustand
pnpm --filter @payos/api add zod
```

### 2.10 Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              @payos/dashboard                           ││
│  │         https://dashboard.payos.dev                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   RAILWAY / RENDER                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  @payos/api                             ││
│  │            https://api.payos.dev                        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                               │
│                   xxx.supabase.co                            │
└─────────────────────────────────────────────────────────────┘
```

**Deploy Dashboard (Vercel):**
```bash
cd apps/dashboard
vercel --prod
```

**Deploy API (Railway):**
```bash
cd apps/api
railway up
```

**Or via Docker:**
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @payos/api build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

---

## 3. External Services & Phasing

### 4.1 The Two-Layer Money Model

PayOS has two layers of "money" — understanding this is key to the phased approach:

```
┌─────────────────────────────────────────────────────────────┐
│                LAYER 1: PayOS Ledger (Your Database)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Account: TechCorp         Balance: $250,000 USDC          │
│   Account: Maria Garcia     Balance: $5,000 USDC            │
│   Account: Carlos Martinez  Balance: $2,500 USDC            │
│                                                              │
│   These are NUMBERS in Supabase. You control them.          │
│   No blockchain required. Instant. Free.                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Only when money moves IN or OUT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             LAYER 2: Real Stablecoins (Blockchain)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Circle: USDC deposits/withdrawals                         │
│   Superfluid: On-chain streaming                            │
│   Payout Rails: Pix, SPEI, local bank transfers             │
│                                                              │
│   Real blockchain transactions. Requires setup.             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key insight:** For demos, Layer 1 is all you need. Layer 2 adds "realness" but isn't required.

### 4.2 Phase 1: Database Only (This Weekend)

Everything runs on your ledger. External services are mocked.

**What works:**
- ✅ Full dashboard UI
- ✅ Account management (create, view, verify)
- ✅ Agent management (create, KYA tiers, permissions)
- ✅ Transfers between accounts (instant ledger updates)
- ✅ Money streaming (calculated mathematically)
- ✅ Real-time balance updates
- ✅ Reports and exports
- ✅ All API endpoints

**What's mocked:**
- 🔸 Circle deposits/withdrawals (instant success)
- 🔸 Payout settlement (simulated delay, then success)
- 🔸 FX rates (static values)
- 🔸 KYC verification (auto-approve in sandbox)

**External services needed:**

| Service | Purpose | Signup |
|---------|---------|--------|
| **Supabase** | Database | https://supabase.com (free) |
| **Vercel** | Dashboard hosting | https://vercel.com (free) |
| **Railway** | API hosting | https://railway.app (free tier) |

**Environment variables:**
```env
# That's it for Phase 1!
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_PORT=4000
CORS_ORIGINS=http://localhost:3000
```

### 4.3 Phase 2: Circle Sandbox Integration

Add real Circle sandbox for USDC operations.

**What's added:**
- ✅ Real USDC test deposits (sandbox)
- ✅ Real USDC test withdrawals (sandbox)
- ✅ Circle wallet creation
- ✅ Transaction IDs from Circle

**What's still mocked:**
- 🔸 Payout rails (Pix, SPEI)
- 🔸 Superfluid streaming

**Additional services:**

| Service | Purpose | Signup |
|---------|---------|--------|
| **Circle** | USDC sandbox | https://console.circle.com (free sandbox) |

**Additional environment variables:**
```env
# Add to Phase 1 vars
CIRCLE_API_KEY=TEST_API_KEY:xxx
CIRCLE_API_URL=https://api-sandbox.circle.com
```

### 4.4 Phase 3: Superfluid Testnet Integration

Add on-chain streaming via Superfluid on Base Sepolia testnet.

**What's added:**
- ✅ Real on-chain streams
- ✅ Blockchain transaction hashes
- ✅ Block explorer links
- ✅ True per-second streaming on-chain

**What's still mocked:**
- 🔸 Payout rails (requires business contracts)

**Additional services:**

| Service | Purpose | Setup |
|---------|---------|-------|
| **Superfluid** | On-chain streaming | No signup (it's a protocol) |
| **Base Sepolia** | Testnet | Get free ETH from faucet |

**Additional environment variables:**
```env
# Add to Phase 2 vars
SUPERFLUID_RPC_URL=https://sepolia.base.org
SUPERFLUID_PRIVATE_KEY=0x...  # Server wallet for signing
SUPERFLUID_HOST_ADDRESS=0x109412E3C84f0539b43d39dB691B08c90f58dC7c
```

**Testnet setup:**
1. Create a wallet (MetaMask or via code)
2. Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia
3. Get test tokens: https://app.superfluid.finance (faucet)

### 4.5 Mock Implementations (Phase 1)

These mocks let you build and demo without external dependencies:

**Circle Mock:**
```typescript
// apps/api/src/providers/circle/mock.ts
export class MockCircleProvider implements CircleProvider {
  async createWallet(accountId: string): Promise<Wallet> {
    return {
      id: `wallet_${Date.now()}`,
      address: `0x${accountId.slice(0, 40)}`,
      currency: 'USDC',
    };
  }
  
  async getBalance(walletId: string): Promise<number> {
    // Return balance from our ledger, not Circle
    const account = await db.accounts.findByWalletId(walletId);
    return account?.balance_available || 0;
  }
  
  async deposit(walletId: string, amount: number): Promise<Transaction> {
    // Instant success in mock
    return {
      id: `tx_${Date.now()}`,
      status: 'complete',
      amount,
      completedAt: new Date().toISOString(),
    };
  }
}
```

**Payout Mock:**
```typescript
// apps/api/src/providers/payout/mock.ts
export class MockPayoutProvider implements PayoutProvider {
  async createPayout(request: PayoutRequest): Promise<Payout> {
    // Simulate realistic processing time
    const processingMs = 2000 + Math.random() * 3000; // 2-5 seconds
    
    return {
      id: `payout_${Date.now()}`,
      status: 'processing',
      amount: request.amount,
      currency: request.currency,
      estimatedCompletion: new Date(Date.now() + processingMs).toISOString(),
    };
  }
  
  async getStatus(payoutId: string): Promise<PayoutStatus> {
    // Simulate completion after delay
    const created = parseInt(payoutId.split('_')[1]);
    const elapsed = Date.now() - created;
    
    if (elapsed > 5000) {
      return { 
        status: 'completed', 
        completedAt: new Date().toISOString() 
      };
    }
    return { status: 'processing' };
  }
}
```

**FX Rates Mock:**
```typescript
// apps/api/src/providers/fx/mock.ts
export const MOCK_FX_RATES: Record<string, number> = {
  USD_MXN: 17.15,
  USD_BRL: 4.97,
  USD_ARS: 365.00,
  USD_COP: 4150.00,
  MXN_USD: 0.058,
  BRL_USD: 0.201,
};

export function getExchangeRate(from: string, to: string): number {
  if (from === to) return 1;
  return MOCK_FX_RATES[`${from}_${to}`] || 1;
}

export function convertAmount(amount: number, from: string, to: string): number {
  return amount * getExchangeRate(from, to);
}
```

**Stream Calculation (No Blockchain):**
```typescript
// apps/api/src/services/streams.ts
export function calculateStreamedAmount(stream: Stream): number {
  if (stream.status === 'cancelled') {
    return stream.totalStreamed;
  }
  
  const now = Date.now();
  const startTime = new Date(stream.startedAt).getTime();
  const elapsedMs = now - startTime;
  
  // Subtract any paused time
  const pausedMs = stream.totalPausedSeconds * 1000;
  const activeMs = elapsedMs - pausedMs;
  const activeSeconds = Math.max(0, activeMs / 1000);
  
  return activeSeconds * stream.flowRate.perSecond;
}

export function calculateRunway(stream: Stream): RunwayInfo {
  const streamed = calculateStreamedAmount(stream);
  const remaining = stream.funded - streamed;
  const runwaySeconds = remaining / stream.flowRate.perSecond;
  
  return {
    seconds: runwaySeconds,
    display: formatRunway(runwaySeconds),
    health: runwaySeconds > 604800 ? 'healthy' : 
            runwaySeconds > 259200 ? 'warning' : 'critical',
  };
}
```

### 4.6 Provider Interface Pattern

Use interfaces so you can swap mocks for real implementations:

```typescript
// packages/types/src/providers.ts
export interface CircleProvider {
  createWallet(accountId: string): Promise<Wallet>;
  getBalance(walletId: string): Promise<number>;
  deposit(walletId: string, amount: number): Promise<Transaction>;
  withdraw(walletId: string, amount: number, destination: string): Promise<Transaction>;
}

export interface PayoutProvider {
  createPayout(request: PayoutRequest): Promise<Payout>;
  getStatus(payoutId: string): Promise<PayoutStatus>;
  cancelPayout(payoutId: string): Promise<void>;
}

export interface StreamProvider {
  createStream(params: CreateStreamParams): Promise<StreamResult>;
  updateStream(streamId: string, flowRate: number): Promise<StreamResult>;
  cancelStream(streamId: string): Promise<void>;
  getStreamBalance(streamId: string): Promise<StreamBalance>;
}
```

```typescript
// apps/api/src/providers/index.ts
import { MockCircleProvider } from './circle/mock';
import { RealCircleProvider } from './circle/real';
import { MockPayoutProvider } from './payout/mock';
import { MockStreamProvider } from './superfluid/mock';
import { SuperfluidProvider } from './superfluid/real';

// Switch based on environment
export function getCircleProvider(): CircleProvider {
  if (process.env.CIRCLE_API_KEY) {
    return new RealCircleProvider(process.env.CIRCLE_API_KEY);
  }
  return new MockCircleProvider();
}

export function getPayoutProvider(): PayoutProvider {
  // Always mock for now - real requires contracts
  return new MockPayoutProvider();
}

export function getStreamProvider(): StreamProvider {
  if (process.env.SUPERFLUID_PRIVATE_KEY) {
    return new SuperfluidProvider();
  }
  return new MockStreamProvider();
}
```

### 4.7 Phase Comparison

| Feature | Phase 1 (Mock) | Phase 2 (Circle) | Phase 3 (Superfluid) |
|---------|----------------|------------------|----------------------|
| Dashboard UI | ✅ Full | ✅ Full | ✅ Full |
| Accounts CRUD | ✅ Real | ✅ Real | ✅ Real |
| Agents & KYA | ✅ Real | ✅ Real | ✅ Real |
| Internal transfers | ✅ Instant | ✅ Instant | ✅ Instant |
| External transfers | 🔸 Mock success | 🔸 Mock success | 🔸 Mock success |
| USDC deposits | 🔸 Mock instant | ✅ Circle sandbox | ✅ Circle sandbox |
| USDC withdrawals | 🔸 Mock instant | ✅ Circle sandbox | ✅ Circle sandbox |
| Stream creation | ✅ DB + math | ✅ DB + math | ✅ On-chain |
| Stream balances | ✅ Calculated | ✅ Calculated | ✅ On-chain query |
| Blockchain links | ❌ None | ❌ None | ✅ Real tx hashes |
| Setup time | 30 min | 1-2 hours | 3-4 hours |
| Demo quality | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 4.8 Recommended Path

```
Weekend 1-2: Phase 1 (Database Only)
├── Full working PoC
├── All features functional
├── Demo-ready for most audiences
└── No external dependencies beyond Supabase

Weekend 3: Phase 2 (Circle)
├── Add Circle sandbox
├── Real USDC test transactions
└── Good for: "We integrate with Circle" proof

Weekend 4+: Phase 3 (Superfluid)
├── Add on-chain streaming
├── Blockchain explorer links
└── Good for: Crypto-native investors, technical deep-dives
```

---

## 4. Data Models

### 4.1 Core Types

```typescript
// types/account.ts
export type AccountType = 'person' | 'business';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';
export type VerificationTier = 0 | 1 | 2 | 3;

export interface Account {
  id: string;
  tenantId: string;
  type: AccountType;
  name: string;
  email?: string;
  
  verification: {
    tier: VerificationTier;
    status: VerificationStatus;
    type: 'kyc' | 'kyb';
  };
  
  balance: {
    total: number;
    available: number;
    inStreams: {
      total: number;
      buffer: number;
      streaming: number;
    };
    currency: 'USDC';
  };
  
  agents: {
    count: number;
    active: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

// types/agent.ts
export type AgentStatus = 'active' | 'paused' | 'suspended';
export type KYATier = 0 | 1 | 2 | 3;
export type KYAStatus = 'unverified' | 'pending' | 'verified' | 'suspended';
export type AuthType = 'api_key' | 'oauth' | 'x402';

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  status: AgentStatus;
  
  parentAccount: {
    id: string;
    type: AccountType;
    name: string;
    verificationTier: VerificationTier;
  };
  
  kya: {
    tier: KYATier;
    status: KYAStatus;
    verifiedAt?: string;
    agentLimits: Limits;
    effectiveLimits: Limits & { cappedByParent: boolean };
  };
  
  permissions: {
    transactions: { initiate: boolean; approve: boolean; view: boolean };
    streams: { initiate: boolean; modify: boolean; pause: boolean; terminate: boolean; view: boolean };
    accounts: { view: boolean; create: boolean };
    treasury: { view: boolean; rebalance: boolean };
  };
  
  streamStats: {
    activeStreams: number;
    totalOutflow: number;
    maxActiveStreams: number;
    maxTotalOutflow: number;
  };
  
  auth: {
    type: AuthType;
    clientId?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface Limits {
  perTransaction: number;
  daily: number;
  monthly: number;
}

// types/transfer.ts
export type TransferType = 
  | 'cross_border' 
  | 'internal' 
  | 'stream_start' 
  | 'stream_withdraw' 
  | 'stream_cancel'
  | 'wrap'
  | 'unwrap';

export type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Transfer {
  id: string;
  tenantId: string;
  type: TransferType;
  status: TransferStatus;
  
  from: { accountId: string; accountName: string };
  to: { accountId: string; accountName: string };
  
  initiatedBy: {
    type: 'user' | 'agent';
    id: string;
    name: string;
  };
  
  amount: number;
  currency: 'USDC';
  
  // Cross-border specific
  destinationAmount?: number;
  destinationCurrency?: string;
  fxRate?: number;
  
  // Stream specific
  streamId?: string;
  
  fees: number;
  
  idempotencyKey?: string;
  
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
}

// types/stream.ts
export type StreamStatus = 'active' | 'paused' | 'cancelled';
export type StreamHealth = 'healthy' | 'warning' | 'critical';
export type StreamCategory = 'salary' | 'subscription' | 'service' | 'other';

export interface Stream {
  id: string;
  tenantId: string;
  status: StreamStatus;
  
  sender: { accountId: string; accountName: string };
  receiver: { accountId: string; accountName: string };
  
  initiatedBy: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    timestamp: string;
  };
  
  managedBy: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    permissions: {
      canModify: boolean;
      canPause: boolean;
      canTerminate: boolean;
    };
  };
  
  flowRate: {
    perSecond: number;
    perMonth: number;
    currency: 'USDC';
  };
  
  streamed: {
    total: number;
    withdrawn: number;
    available: number;
  };
  
  funding: {
    wrapped: number;
    buffer: number;
    runway: {
      seconds: number;
      display: string;
    };
  };
  
  health: StreamHealth;
  
  description: string;
  category: StreamCategory;
  
  startedAt: string;
  pausedAt?: string;
  cancelledAt?: string;
  
  onChain?: {
    network: string;
    flowId: string;
    txHash: string;
  };
  
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Database Schema

See `supabase/migrations/001_initial_schema.sql` in the repository.

---

## Epic 1: Foundation & Multi-Tenancy

### Overview
Set up the monorepo project foundation, database schema, and multi-tenant infrastructure.

### Stories

#### Story 1.1: Monorepo Setup
**Points:** 3  
**Priority:** P0  

**Description:**  
Initialize Turborepo monorepo with dashboard and API apps, plus shared packages.

**Acceptance Criteria:**
- [ ] Turborepo project created with pnpm workspaces
- [ ] `apps/dashboard` - Next.js 14 with TypeScript, Tailwind, Shadcn/ui
- [ ] `apps/api` - Hono with TypeScript
- [ ] `packages/types` - Shared TypeScript types
- [ ] `packages/utils` - Shared utilities
- [ ] `packages/db` - Database migrations and seed
- [ ] ESLint and Prettier configured at root
- [ ] `pnpm dev` runs both apps concurrently
- [ ] Git repository initialized with .gitignore

**Commands:**
```bash
# Create directory structure
mkdir -p payos/{apps/{dashboard,api},packages/{types,utils,db}}
cd payos

# Initialize root package.json
pnpm init

# Install turborepo
pnpm add -D turbo

# Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Initialize dashboard
cd apps/dashboard
pnpm create next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"
pnpm add @tanstack/react-query zustand
pnpm dlx shadcn@latest init

# Initialize API
cd ../api
pnpm init
pnpm add hono @hono/node-server @supabase/supabase-js zod
pnpm add -D tsx tsup typescript @types/node

# Initialize shared packages
cd ../../packages/types
pnpm init
pnpm add -D tsup typescript

cd ../utils
pnpm init
pnpm add -D tsup typescript

cd ../db
pnpm init
```

**Files to Create:**
- `turbo.json`
- `pnpm-workspace.yaml`
- `package.json` (root)
- `.env.example`
- `apps/dashboard/*` (Next.js scaffold)
- `apps/api/src/index.ts`
- `apps/api/src/app.ts`
- `packages/types/src/index.ts`
- `packages/utils/src/index.ts`

---

#### Story 1.2: Database Schema - Core Tables
**Points:** 3  
**Priority:** P0  

**Description:**  
Create core database tables: tenants, accounts, ledger.

**Acceptance Criteria:**
- [ ] `tenants` table created with id, name, api_key
- [ ] `accounts` table created with all fields from data model
- [ ] `ledger_entries` table for balance tracking
- [ ] RLS policies for tenant isolation
- [ ] Indexes for common queries

**File:** `packages/db/migrations/001_initial_schema.sql`

```sql
-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  api_key_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('person', 'business')),
  name TEXT NOT NULL,
  email TEXT,
  
  -- Verification
  verification_tier INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'unverified',
  verification_type TEXT CHECK (verification_type IN ('kyc', 'kyb')),
  
  -- Balance (denormalized)
  balance_total NUMERIC(20,8) DEFAULT 0,
  balance_available NUMERIC(20,8) DEFAULT 0,
  balance_in_streams NUMERIC(20,8) DEFAULT 0,
  balance_buffer NUMERIC(20,8) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_verification_type CHECK (
    (type = 'person' AND verification_type = 'kyc') OR
    (type = 'business' AND verification_type = 'kyb') OR
    verification_type IS NULL
  )
);

-- Ledger Entries
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  
  type TEXT NOT NULL, -- 'credit', 'debit', 'hold', 'release'
  amount NUMERIC(20,8) NOT NULL,
  balance_after NUMERIC(20,8) NOT NULL,
  
  reference_type TEXT, -- 'transfer', 'stream', 'fee'
  reference_id UUID,
  
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX idx_accounts_type ON accounts(tenant_id, type);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_ledger_reference ON ledger_entries(reference_type, reference_id);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses, anon uses tenant context)
CREATE POLICY "Tenant isolation for accounts" ON accounts
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

#### Story 1.3: API Middleware & Auth
**Points:** 3  
**Priority:** P0  

**Description:**  
Create API middleware for authentication and tenant resolution in the Hono API server.

**Acceptance Criteria:**
- [ ] Middleware extracts API key from Authorization header
- [ ] Tenant resolved from API key
- [ ] Request context includes tenantId, actorType, actorId
- [ ] Unauthorized requests return 401
- [ ] Invalid tenant returns 403
- [ ] Agent tokens validated and status checked

**File:** `apps/api/src/middleware/auth.ts`

```typescript
import { Context, Next } from 'hono';
import { createClient } from '../db/client';

export interface RequestContext {
  tenantId: string;
  actorType: 'user' | 'agent';
  actorId: string;
  actorName: string;
}

// Extend Hono's context type
declare module 'hono' {
  interface ContextVariableMap {
    ctx: RequestContext;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }
  
  const token = authHeader.slice(7);
  const supabase = createClient();
  
  // Partner API key (pk_test_xxx)
  if (token.startsWith('pk_')) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('api_key', token)
      .eq('status', 'active')
      .single();
    
    if (error || !tenant) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    
    c.set('ctx', {
      tenantId: tenant.id,
      actorType: 'user',
      actorId: 'api_user',
      actorName: 'API User',
    });
    
    return next();
  }
  
  // Agent token (agent_xxx)
  if (token.startsWith('agent_')) {
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, tenant_id, status, kya_tier')
      .eq('auth_client_id', token)
      .single();
    
    if (error || !agent) {
      return c.json({ error: 'Invalid agent token' }, 401);
    }
    
    if (agent.status !== 'active') {
      return c.json({ error: 'Agent is not active', status: agent.status }, 403);
    }
    
    c.set('ctx', {
      tenantId: agent.tenant_id,
      actorType: 'agent',
      actorId: agent.id,
      actorName: agent.name,
    });
    
    return next();
  }
  
  return c.json({ error: 'Invalid token format' }, 401);
}
```

**File:** `apps/api/src/db/client.ts`

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}
```

---

#### Story 1.4: Seed Data
**Points:** 1  
**Priority:** P0  

**Description:**  
Create seed data for development and demos.

**Acceptance Criteria:**
- [ ] Demo tenant created with API key
- [ ] Sample Person accounts (Maria Garcia, Carlos Martinez)
- [ ] Sample Business account (TechCorp Inc)
- [ ] Initial balances set

**File:** `packages/db/seed.sql`

```sql
-- Demo Tenant
INSERT INTO tenants (id, name, api_key, api_key_hash, status)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Demo Fintech',
  'pk_test_demo_fintech_key_12345',
  'hashed_value_here',
  'active'
);

-- Business Account
INSERT INTO accounts (id, tenant_id, type, name, email, verification_tier, verification_status, verification_type, balance_total, balance_available)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'business',
  'TechCorp Inc',
  'finance@techcorp.com',
  2,
  'verified',
  'kyb',
  250000.00,
  250000.00
);

-- Person Accounts
INSERT INTO accounts (id, tenant_id, type, name, email, verification_tier, verification_status, verification_type, balance_total, balance_available)
VALUES 
(
  'cccccccc-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'person',
  'Maria Garcia',
  'maria@email.com',
  2,
  'verified',
  'kyc',
  5000.00,
  5000.00
),
(
  'cccccccc-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'person',
  'Carlos Martinez',
  'carlos@email.com',
  1,
  'verified',
  'kyc',
  2500.00,
  2500.00
);
```

---

## Epic 2: Account System

### Overview
Implement account management including CRUD operations, balance tracking, and verification.

### Stories

#### Story 2.1: Accounts API - List & Create
**Points:** 3  
**Priority:** P0  

**Description:**  
Implement GET (list) and POST (create) endpoints for accounts.

**Acceptance Criteria:**
- [ ] GET /v1/accounts returns paginated list
- [ ] Supports filtering by type (person/business)
- [ ] Supports search by name/email
- [ ] POST /v1/accounts creates new account
- [ ] Validates required fields
- [ ] Returns proper error messages

**File:** `apps/api/src/routes/accounts.ts`

```typescript
import { Hono } from 'hono';
import { createClient } from '../db/client';
import { mapAccountFromDb, logAudit } from '../utils/helpers';
import type { Account } from '@payos/types';

const accounts = new Hono();

// GET /v1/accounts - List accounts
accounts.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  const type = c.req.query('type');
  const search = c.req.query('search');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  
  let query = supabase
    .from('accounts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (type) query = query.eq('type', type);
  if (search) query = query.ilike('name', `%${search}%`);
  
  const { data, count, error } = await query;
  
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  
  return c.json({
    data: data.map(mapAccountFromDb),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
});

// POST /v1/accounts - Create account
accounts.post('/', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();
  const supabase = createClient();
  
  // Validation
  if (!body.type || !body.name) {
    return c.json({ error: 'type and name are required' }, 400);
  }
  
  if (!['person', 'business'].includes(body.type)) {
    return c.json({ error: 'type must be person or business' }, 400);
  }
  
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      tenant_id: ctx.tenantId,
      type: body.type,
      name: body.name,
      email: body.email,
      verification_type: body.type === 'person' ? 'kyc' : 'kyb',
    })
    .select()
    .single();
  
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'account',
    entityId: data.id,
    action: 'created',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
  });
  
  return c.json({ data: mapAccountFromDb(data) }, 201);
});

// GET /v1/accounts/:id - Get single account
accounts.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !data) {
    return c.json({ error: 'Account not found' }, 404);
  }
  
  // Get agent count
  const { count: agentCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('parent_account_id', id);
  
  const account = mapAccountFromDb(data);
  account.agents = { count: agentCount || 0, active: agentCount || 0 };
  
  return c.json({ data: account });
});

// GET /v1/accounts/:id/balances - Get balance breakdown
accounts.get('/:id/balances', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, balance_total, balance_available, balance_in_streams, balance_buffer')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !data) {
    return c.json({ error: 'Account not found' }, 404);
  }
  
  return c.json({
    data: {
      accountId: data.id,
      accountName: data.name,
      balance: {
        total: parseFloat(data.balance_total),
        available: parseFloat(data.balance_available),
        inStreams: {
          total: parseFloat(data.balance_in_streams),
          buffer: parseFloat(data.balance_buffer),
          streaming: parseFloat(data.balance_in_streams) - parseFloat(data.balance_buffer),
        },
        currency: 'USDC',
      },
    },
  });
});

// GET /v1/accounts/:id/agents - Get account's agents
accounts.get('/:id/agents', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('parent_account_id', id)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  
  return c.json({ data: data.map(mapAgentFromDb) });
});

// GET /v1/accounts/:id/streams - Get account's streams
accounts.get('/:id/streams', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  // Get streams where account is sender or receiver
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .or(`sender_account_id.eq.${id},receiver_account_id.eq.${id}`)
    .order('created_at', { ascending: false });
  
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  
  return c.json({ data: data.map(mapStreamFromDb) });
});

export default accounts;
      actorId: ctx.actorId,
      actorName: ctx.actorName,
    });
    
    return NextResponse.json({ data: mapAccountFromDb(data) }, { status: 201 });
  });
}

function mapAccountFromDb(row: any): Account {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    name: row.name,
    email: row.email,
    verification: {
      tier: row.verification_tier,
      status: row.verification_status,
      type: row.verification_type,
    },
    balance: {
      total: parseFloat(row.balance_total),
      available: parseFloat(row.balance_available),
      inStreams: {
        total: parseFloat(row.balance_in_streams),
        buffer: parseFloat(row.balance_buffer),
        streaming: parseFloat(row.balance_in_streams) - parseFloat(row.balance_buffer),
      },
      currency: 'USDC',
    },
    agents: { count: 0, active: 0 }, // Populated separately
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

---

#### Story 2.2: Accounts API - Get, Update, Delete
**Points:** 2  
**Priority:** P0  

**Description:**  
Implement GET, PATCH, DELETE for individual accounts.

**Acceptance Criteria:**
- [ ] GET /api/v1/accounts/:id returns account with agents count
- [ ] PATCH updates allowed fields (name, email)
- [ ] DELETE soft-deletes or rejects if has balance
- [ ] 404 for non-existent accounts
- [ ] 403 for wrong tenant

**File:** `app/api/v1/accounts/[id]/route.ts`

---

#### Story 2.3: Balance Service
**Points:** 3  
**Priority:** P0  

**Description:**  
Implement balance tracking service with ledger entries.

**Acceptance Criteria:**
- [ ] Credit/debit operations create ledger entries
- [ ] Balance updates are atomic
- [ ] Hold/release for stream buffers
- [ ] Get balance breakdown endpoint
- [ ] Insufficient balance returns clear error

**File:** `lib/services/balances.ts`

```typescript
export class BalanceService {
  constructor(private supabase: SupabaseClient) {}
  
  async getBalance(accountId: string): Promise<AccountBalance> {
    const { data } = await this.supabase
      .from('accounts')
      .select('balance_total, balance_available, balance_in_streams, balance_buffer')
      .eq('id', accountId)
      .single();
    
    return {
      total: parseFloat(data.balance_total),
      available: parseFloat(data.balance_available),
      inStreams: {
        total: parseFloat(data.balance_in_streams),
        buffer: parseFloat(data.balance_buffer),
        streaming: parseFloat(data.balance_in_streams) - parseFloat(data.balance_buffer),
      },
      currency: 'USDC',
    };
  }
  
  async credit(
    accountId: string,
    amount: number,
    reference: { type: string; id: string },
    description: string
  ): Promise<void> {
    // Transaction: create ledger entry + update balance
    await this.supabase.rpc('credit_account', {
      p_account_id: accountId,
      p_amount: amount,
      p_reference_type: reference.type,
      p_reference_id: reference.id,
      p_description: description,
    });
  }
  
  async debit(
    accountId: string,
    amount: number,
    reference: { type: string; id: string },
    description: string
  ): Promise<void> {
    // Check available balance first
    const balance = await this.getBalance(accountId);
    if (balance.available < amount) {
      throw new InsufficientBalanceError(balance.available, amount);
    }
    
    await this.supabase.rpc('debit_account', {
      p_account_id: accountId,
      p_amount: amount,
      p_reference_type: reference.type,
      p_reference_id: reference.id,
      p_description: description,
    });
  }
  
  async holdForStream(
    accountId: string,
    streamId: string,
    amount: number,
    bufferAmount: number
  ): Promise<void> {
    // Move from available to in_streams
    await this.supabase.rpc('hold_for_stream', {
      p_account_id: accountId,
      p_stream_id: streamId,
      p_amount: amount,
      p_buffer: bufferAmount,
    });
  }
  
  async releaseFromStream(
    accountId: string,
    streamId: string,
    returnBuffer: boolean
  ): Promise<void> {
    await this.supabase.rpc('release_from_stream', {
      p_account_id: accountId,
      p_stream_id: streamId,
      p_return_buffer: returnBuffer,
    });
  }
}
```

---

#### Story 2.4: Account Balance Endpoint
**Points:** 1  
**Priority:** P0  

**Description:**  
GET endpoint for account balance breakdown.

**Acceptance Criteria:**
- [ ] Returns total, available, inStreams breakdown
- [ ] Includes net flow information
- [ ] Includes stream counts

**File:** `app/api/v1/accounts/[id]/balances/route.ts`

---

## Epic 3: Agent System & KYA

### Overview
Implement agent registration, KYA verification, permissions, and limit inheritance.

### Stories

#### Story 3.1: Agents Database Schema
**Points:** 2  
**Priority:** P0  

**Description:**  
Create agents table and related structures.

**File:** `supabase/migrations/002_agents.sql`

```sql
-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
  
  -- KYA
  kya_tier INTEGER DEFAULT 0 CHECK (kya_tier BETWEEN 0 AND 3),
  kya_status TEXT DEFAULT 'unverified' CHECK (kya_status IN ('unverified', 'pending', 'verified', 'suspended')),
  kya_verified_at TIMESTAMPTZ,
  
  -- Limits (from KYA tier)
  limit_per_transaction NUMERIC(20,8) DEFAULT 0,
  limit_daily NUMERIC(20,8) DEFAULT 0,
  limit_monthly NUMERIC(20,8) DEFAULT 0,
  
  -- Effective limits (calculated)
  effective_limit_per_tx NUMERIC(20,8) DEFAULT 0,
  effective_limit_daily NUMERIC(20,8) DEFAULT 0,
  effective_limit_monthly NUMERIC(20,8) DEFAULT 0,
  effective_limits_capped BOOLEAN DEFAULT false,
  
  -- Stream limits
  max_active_streams INTEGER DEFAULT 5,
  max_flow_rate_per_stream NUMERIC(20,8) DEFAULT 5000,
  max_total_outflow NUMERIC(20,8) DEFAULT 50000,
  
  -- Current stream stats (denormalized)
  active_streams_count INTEGER DEFAULT 0,
  total_stream_outflow NUMERIC(20,8) DEFAULT 0,
  
  -- Permissions
  permissions JSONB DEFAULT '{
    "transactions": {"initiate": true, "approve": false, "view": true},
    "streams": {"initiate": true, "modify": true, "pause": true, "terminate": true, "view": true},
    "accounts": {"view": true, "create": false},
    "treasury": {"view": false, "rebalance": false}
  }'::jsonb,
  
  -- Auth
  auth_type TEXT DEFAULT 'api_key' CHECK (auth_type IN ('api_key', 'oauth', 'x402')),
  auth_client_id TEXT UNIQUE,
  auth_client_secret_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_parent ON agents(parent_account_id);
CREATE INDEX idx_agents_client_id ON agents(auth_client_id);

-- RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Trigger to calculate effective limits
CREATE OR REPLACE FUNCTION calculate_effective_limits()
RETURNS TRIGGER AS $$
DECLARE
  parent_tier INTEGER;
  parent_limits RECORD;
BEGIN
  -- Get parent account tier
  SELECT verification_tier INTO parent_tier
  FROM accounts WHERE id = NEW.parent_account_id;
  
  -- Get tier limits (simplified - would be a lookup table in production)
  -- KYC/KYB T2 = 50000/200000/500000
  -- KYA T1 = 1000/10000/50000, T2 = 10000/100000/500000
  
  NEW.effective_limit_per_tx := LEAST(NEW.limit_per_transaction, 50000); -- Simplified
  NEW.effective_limit_daily := LEAST(NEW.limit_daily, 200000);
  NEW.effective_limit_monthly := LEAST(NEW.limit_monthly, 500000);
  NEW.effective_limits_capped := (
    NEW.limit_per_transaction > NEW.effective_limit_per_tx OR
    NEW.limit_daily > NEW.effective_limit_daily OR
    NEW.limit_monthly > NEW.effective_limit_monthly
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_effective_limits
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION calculate_effective_limits();
```

---

#### Story 3.2: Agents API - CRUD
**Points:** 3  
**Priority:** P0  

**Description:**  
Implement full CRUD for agents.

**Acceptance Criteria:**
- [ ] POST creates agent under parent account
- [ ] Generates unique client_id for auth
- [ ] Calculates effective limits on create
- [ ] GET list includes parent account info
- [ ] GET single includes all details
- [ ] PATCH updates name, description, permissions
- [ ] Cannot change parent account

**File:** `app/api/v1/agents/route.ts` and `app/api/v1/agents/[id]/route.ts`

---

#### Story 3.3: Agent Status Management
**Points:** 2  
**Priority:** P1  

**Description:**  
Implement suspend/activate endpoints for agents.

**Acceptance Criteria:**
- [ ] POST /agents/:id/suspend sets status to suspended
- [ ] POST /agents/:id/activate sets status to active
- [ ] Suspended agents cannot make API calls
- [ ] Logs status changes to audit

**Files:** 
- `app/api/v1/agents/[id]/suspend/route.ts`
- `app/api/v1/agents/[id]/activate/route.ts`

---

#### Story 3.4: Agent Streams Endpoint
**Points:** 2  
**Priority:** P1  

**Description:**  
GET endpoint for streams managed by an agent.

**Acceptance Criteria:**
- [ ] Returns streams where managed_by_id = agent.id
- [ ] Includes health status
- [ ] Includes flow rates and runway

**File:** `app/api/v1/agents/[id]/streams/route.ts`

---

#### Story 3.5: Limit Checking Service
**Points:** 3  
**Priority:** P0  

**Description:**  
Service to check if an action is within agent limits.

**Acceptance Criteria:**
- [ ] Checks per-transaction limit
- [ ] Tracks and checks daily usage
- [ ] Tracks and checks monthly usage
- [ ] Returns clear error with limit details
- [ ] Works for both transfers and streams

**File:** `lib/services/limits.ts`

```typescript
export class LimitService {
  async checkTransactionLimit(
    agentId: string,
    amount: number
  ): Promise<LimitCheckResult> {
    const agent = await this.getAgent(agentId);
    
    // Per-transaction check
    if (amount > agent.effectiveLimits.perTransaction) {
      return {
        allowed: false,
        reason: 'exceeds_per_transaction',
        limit: agent.effectiveLimits.perTransaction,
        requested: amount,
      };
    }
    
    // Daily usage check
    const dailyUsage = await this.getDailyUsage(agentId);
    if (dailyUsage + amount > agent.effectiveLimits.daily) {
      return {
        allowed: false,
        reason: 'exceeds_daily',
        limit: agent.effectiveLimits.daily,
        used: dailyUsage,
        requested: amount,
      };
    }
    
    // Monthly usage check
    const monthlyUsage = await this.getMonthlyUsage(agentId);
    if (monthlyUsage + amount > agent.effectiveLimits.monthly) {
      return {
        allowed: false,
        reason: 'exceeds_monthly',
        limit: agent.effectiveLimits.monthly,
        used: monthlyUsage,
        requested: amount,
      };
    }
    
    return { allowed: true };
  }
  
  async checkStreamLimit(
    agentId: string,
    flowRatePerMonth: number
  ): Promise<LimitCheckResult> {
    const agent = await this.getAgent(agentId);
    
    // Stream count check
    if (agent.streamStats.activeStreams >= agent.streamStats.maxActiveStreams) {
      return {
        allowed: false,
        reason: 'max_streams_reached',
        limit: agent.streamStats.maxActiveStreams,
      };
    }
    
    // Per-stream flow rate check
    if (flowRatePerMonth > agent.streamStats.maxFlowRatePerStream) {
      return {
        allowed: false,
        reason: 'exceeds_max_flow_rate',
        limit: agent.streamStats.maxFlowRatePerStream,
        requested: flowRatePerMonth,
      };
    }
    
    // Total outflow check
    const newTotalOutflow = agent.streamStats.totalOutflow + flowRatePerMonth;
    if (newTotalOutflow > agent.streamStats.maxTotalOutflow) {
      return {
        allowed: false,
        reason: 'exceeds_total_outflow',
        limit: agent.streamStats.maxTotalOutflow,
        current: agent.streamStats.totalOutflow,
        requested: flowRatePerMonth,
      };
    }
    
    return { allowed: true };
  }
}
```

---

## Epic 4: Transfers & Payments

### Overview
Implement transfer creation, processing, and status tracking.

### Stories

#### Story 4.1: Transfers Database Schema
**Points:** 2  
**Priority:** P0  

**Description:**  
Create transfers table with all required fields.

**Migration additions to initial schema:**

```sql
-- Transfers
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  type TEXT NOT NULL CHECK (type IN (
    'cross_border', 'internal', 'stream_start', 'stream_withdraw', 
    'stream_cancel', 'wrap', 'unwrap'
  )),
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  
  from_account_id UUID REFERENCES accounts(id),
  from_account_name TEXT,
  to_account_id UUID REFERENCES accounts(id),
  to_account_name TEXT,
  
  -- Attribution
  initiated_by_type TEXT NOT NULL CHECK (initiated_by_type IN ('user', 'agent')),
  initiated_by_id TEXT NOT NULL,
  initiated_by_name TEXT,
  
  amount NUMERIC(20,8) NOT NULL,
  currency TEXT DEFAULT 'USDC',
  
  -- Cross-border
  destination_amount NUMERIC(20,8),
  destination_currency TEXT,
  fx_rate NUMERIC(20,8),
  corridor_id TEXT,
  
  -- Stream reference
  stream_id UUID REFERENCES streams(id),
  
  -- Fees
  fee_amount NUMERIC(20,8) DEFAULT 0,
  
  -- External references
  external_payout_id TEXT,
  external_issuer_id TEXT,
  
  -- Idempotency
  idempotency_key TEXT UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX idx_transfers_tenant ON transfers(tenant_id);
CREATE INDEX idx_transfers_from ON transfers(from_account_id);
CREATE INDEX idx_transfers_to ON transfers(to_account_id);
CREATE INDEX idx_transfers_status ON transfers(tenant_id, status);
CREATE INDEX idx_transfers_idempotency ON transfers(idempotency_key);
```

---

#### Story 4.2: Quotes API
**Points:** 2  
**Priority:** P0  

**Description:**  
Implement quotes endpoint for transfer pricing.

**Acceptance Criteria:**
- [ ] POST /api/v1/quotes returns quote
- [ ] Calculates FX rate (mocked)
- [ ] Calculates fees
- [ ] Returns destination amount
- [ ] Quote valid for 5 minutes

**File:** `app/api/v1/quotes/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    const body = await req.json();
    
    const { 
      fromCurrency = 'USD',
      toCurrency,
      amount,
      corridor 
    } = body;
    
    // Validate
    if (!toCurrency || !amount) {
      return NextResponse.json(
        { error: 'toCurrency and amount are required' },
        { status: 400 }
      );
    }
    
    // Get FX rate (mocked for PoC)
    const fxRates: Record<string, number> = {
      'USD_MXN': 17.15,
      'USD_BRL': 4.95,
    };
    
    const rateKey = `${fromCurrency}_${toCurrency}`;
    const fxRate = fxRates[rateKey] || 1;
    
    // Calculate fees (simplified)
    const feePercent = 0.005; // 0.5%
    const feeAmount = amount * feePercent;
    const netAmount = amount - feeAmount;
    const destinationAmount = netAmount * fxRate;
    
    const quote = {
      id: `quote_${Date.now()}`,
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: Math.round(destinationAmount * 100) / 100,
      fxRate,
      fees: {
        total: feeAmount,
        breakdown: [
          { type: 'platform_fee', amount: feeAmount }
        ]
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      estimatedSettlement: '1-2 minutes',
    };
    
    return NextResponse.json({ data: quote });
  });
}
```

---

#### Story 4.3: Transfers API - Create
**Points:** 3  
**Priority:** P0  

**Description:**  
Implement transfer creation with idempotency.

**Acceptance Criteria:**
- [ ] POST /api/v1/transfers creates transfer
- [ ] Validates sender has sufficient balance
- [ ] If agent, checks limits
- [ ] Supports idempotency key
- [ ] Returns immediately with status=processing
- [ ] Enqueues background job for execution

**File:** `app/api/v1/transfers/route.ts`

---

#### Story 4.4: Internal Transfers API
**Points:** 2  
**Priority:** P0  

**Description:**  
Ledger-only transfers between accounts.

**Acceptance Criteria:**
- [ ] POST /api/v1/internal-transfers
- [ ] Both accounts must be in same tenant
- [ ] Debits sender, credits receiver atomically
- [ ] Completes synchronously (no background job)
- [ ] < 300ms response time

**File:** `app/api/v1/internal-transfers/route.ts`

---

#### Story 4.5: Transfer Processing Worker
**Points:** 3  
**Priority:** P1  

**Description:**  
Background worker to process transfers.

**Acceptance Criteria:**
- [ ] Polls for pending transfers
- [ ] Calls payout provider (mock)
- [ ] Updates status on completion/failure
- [ ] Handles retries
- [ ] Updates balances on completion

**File:** `lib/workers/transfer-processor.ts`

---

## Epic 5: Money Streaming

### Overview
Implement Superfluid-based money streaming with health monitoring.

### Stories

#### Story 5.1: Streams Database Schema
**Points:** 2  
**Priority:** P0  

**File:** `supabase/migrations/003_streams.sql`

```sql
-- Streams
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  
  -- Parties
  sender_account_id UUID NOT NULL REFERENCES accounts(id),
  sender_account_name TEXT NOT NULL,
  receiver_account_id UUID NOT NULL REFERENCES accounts(id),
  receiver_account_name TEXT NOT NULL,
  
  -- Attribution
  initiated_by_type TEXT NOT NULL CHECK (initiated_by_type IN ('user', 'agent')),
  initiated_by_id TEXT NOT NULL,
  initiated_by_name TEXT,
  
  managed_by_type TEXT NOT NULL CHECK (managed_by_type IN ('user', 'agent')),
  managed_by_id TEXT NOT NULL,
  managed_by_name TEXT,
  managed_by_can_modify BOOLEAN DEFAULT true,
  managed_by_can_pause BOOLEAN DEFAULT true,
  managed_by_can_terminate BOOLEAN DEFAULT true,
  
  -- Flow
  flow_rate_per_second NUMERIC(30,18) NOT NULL,
  flow_rate_per_month NUMERIC(20,8) NOT NULL,
  currency TEXT DEFAULT 'USDC',
  
  -- Amounts (updated periodically or on events)
  total_streamed NUMERIC(20,8) DEFAULT 0,
  total_withdrawn NUMERIC(20,8) DEFAULT 0,
  
  -- Funding
  funded_amount NUMERIC(20,8) DEFAULT 0,
  buffer_amount NUMERIC(20,8) DEFAULT 0,
  runway_seconds INTEGER,
  
  -- Health
  health TEXT DEFAULT 'healthy' CHECK (health IN ('healthy', 'warning', 'critical')),
  
  -- Metadata
  description TEXT,
  category TEXT CHECK (category IN ('salary', 'subscription', 'service', 'other')),
  
  -- On-chain
  onchain_network TEXT,
  onchain_flow_id TEXT,
  onchain_tx_hash TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stream events (for activity log)
CREATE TABLE stream_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id),
  tenant_id UUID NOT NULL,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'funded', 'paused', 'resumed', 'cancelled',
    'withdrawn', 'topped_up', 'health_changed', 'rate_modified'
  )),
  
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT,
  
  data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_streams_tenant ON streams(tenant_id);
CREATE INDEX idx_streams_sender ON streams(sender_account_id);
CREATE INDEX idx_streams_receiver ON streams(receiver_account_id);
CREATE INDEX idx_streams_manager ON streams(managed_by_type, managed_by_id);
CREATE INDEX idx_streams_status ON streams(tenant_id, status);
CREATE INDEX idx_stream_events_stream ON stream_events(stream_id);
```

---

#### Story 5.2: Streams API - Create
**Points:** 4  
**Priority:** P0  

**Description:**  
Create stream with funding and optional Superfluid integration.

**Acceptance Criteria:**
- [ ] POST /api/v1/streams creates stream
- [ ] Calculates buffer (4 hours of flow)
- [ ] Validates sender has sufficient balance
- [ ] If agent, checks stream limits
- [ ] Holds funds from sender balance
- [ ] Optionally creates on-chain Superfluid flow
- [ ] Returns with health status

**File:** `app/api/v1/streams/route.ts`

```typescript
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    const body = await req.json();
    const supabase = createClient();
    
    const {
      senderAccountId,
      receiverAccountId,
      flowRatePerMonth,
      initialFunding,
      description,
      category = 'other',
    } = body;
    
    // Validation
    if (!senderAccountId || !receiverAccountId || !flowRatePerMonth) {
      return NextResponse.json(
        { error: 'senderAccountId, receiverAccountId, and flowRatePerMonth are required' },
        { status: 400 }
      );
    }
    
    // Get accounts
    const [sender, receiver] = await Promise.all([
      getAccount(supabase, senderAccountId),
      getAccount(supabase, receiverAccountId),
    ]);
    
    if (!sender || !receiver) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Calculate flow rates
    const flowRatePerSecond = flowRatePerMonth / (30 * 24 * 60 * 60);
    
    // Calculate buffer (4 hours)
    const bufferHours = 4;
    const bufferAmount = flowRatePerSecond * bufferHours * 60 * 60;
    
    // Calculate minimum funding (buffer + 7 days runway)
    const minFunding = bufferAmount + (flowRatePerSecond * 7 * 24 * 60 * 60);
    const fundingAmount = initialFunding || minFunding;
    
    if (fundingAmount < minFunding) {
      return NextResponse.json(
        { error: `Minimum funding is ${minFunding.toFixed(2)} USDC` },
        { status: 400 }
      );
    }
    
    // Check sender balance
    if (sender.balance.available < fundingAmount) {
      return NextResponse.json(
        { error: 'Insufficient balance', available: sender.balance.available, required: fundingAmount },
        { status: 400 }
      );
    }
    
    // If agent, check limits
    if (ctx.actorType === 'agent') {
      const limitService = new LimitService(supabase);
      const check = await limitService.checkStreamLimit(ctx.actorId, flowRatePerMonth);
      if (!check.allowed) {
        return NextResponse.json(
          { error: 'Stream limit exceeded', details: check },
          { status: 403 }
        );
      }
    }
    
    // Calculate runway
    const runwaySeconds = Math.floor((fundingAmount - bufferAmount) / flowRatePerSecond);
    const health = calculateHealth(runwaySeconds);
    
    // Create stream
    const { data: stream, error } = await supabase
      .from('streams')
      .insert({
        tenant_id: ctx.tenantId,
        status: 'active',
        sender_account_id: senderAccountId,
        sender_account_name: sender.name,
        receiver_account_id: receiverAccountId,
        receiver_account_name: receiver.name,
        initiated_by_type: ctx.actorType,
        initiated_by_id: ctx.actorId,
        initiated_by_name: ctx.actorName,
        managed_by_type: ctx.actorType,
        managed_by_id: ctx.actorId,
        managed_by_name: ctx.actorName,
        flow_rate_per_second: flowRatePerSecond,
        flow_rate_per_month: flowRatePerMonth,
        funded_amount: fundingAmount,
        buffer_amount: bufferAmount,
        runway_seconds: runwaySeconds,
        health,
        description,
        category,
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Hold funds from sender
    const balanceService = new BalanceService(supabase);
    await balanceService.holdForStream(senderAccountId, stream.id, fundingAmount, bufferAmount);
    
    // Update agent stream stats if applicable
    if (ctx.actorType === 'agent') {
      await updateAgentStreamStats(supabase, ctx.actorId, 1, flowRatePerMonth);
    }
    
    // Log event
    await logStreamEvent(supabase, stream.id, ctx.tenantId, 'created', ctx, { fundingAmount });
    
    return NextResponse.json({ data: mapStreamFromDb(stream) }, { status: 201 });
  });
}

function calculateHealth(runwaySeconds: number): StreamHealth {
  const days = runwaySeconds / (24 * 60 * 60);
  if (days > 7) return 'healthy';
  if (days > 1) return 'warning';
  return 'critical';
}

function formatRunway(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  if (days > 0) return `${days} days`;
  const hours = Math.floor(seconds / (60 * 60));
  if (hours > 0) return `${hours} hours`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minutes`;
}
```

---

#### Story 5.3: Streams API - Management
**Points:** 3  
**Priority:** P0  

**Description:**  
Implement pause, resume, cancel, top-up endpoints.

**Acceptance Criteria:**
- [ ] POST /streams/:id/pause - sets status to paused
- [ ] POST /streams/:id/resume - sets status to active
- [ ] POST /streams/:id/cancel - sets status to cancelled, releases funds
- [ ] POST /streams/:id/top-up - adds funding, extends runway
- [ ] Only manager can perform actions
- [ ] All actions logged to stream_events

**Files:**
- `app/api/v1/streams/[id]/pause/route.ts`
- `app/api/v1/streams/[id]/resume/route.ts`
- `app/api/v1/streams/[id]/cancel/route.ts`
- `app/api/v1/streams/[id]/top-up/route.ts`

---

#### Story 5.4: Stream Withdraw API
**Points:** 2  
**Priority:** P0  

**Description:**  
Receiver withdraws accumulated funds from stream.

**Acceptance Criteria:**
- [ ] POST /streams/:id/withdraw
- [ ] Only receiver can withdraw
- [ ] Calculates available amount (streamed - withdrawn)
- [ ] Credits receiver balance
- [ ] Creates withdrawal transfer record
- [ ] Updates stream totals

**File:** `app/api/v1/streams/[id]/withdraw/route.ts`

---

#### Story 5.5: Stream Balance Calculation
**Points:** 2  
**Priority:** P0  

**Description:**  
Real-time stream balance calculation service.

**Acceptance Criteria:**
- [ ] Calculates current streamed amount from start time
- [ ] Accounts for pause periods
- [ ] Returns available to withdraw
- [ ] Updates runway based on remaining funds
- [ ] Updates health status

**File:** `lib/services/streams.ts`

```typescript
export class StreamService {
  calculateCurrentBalance(stream: Stream): StreamBalance {
    if (stream.status === 'cancelled') {
      return {
        total: stream.totalStreamed,
        withdrawn: stream.totalWithdrawn,
        available: stream.totalStreamed - stream.totalWithdrawn,
      };
    }
    
    if (stream.status === 'paused') {
      // Use stored values
      return {
        total: stream.totalStreamed,
        withdrawn: stream.totalWithdrawn,
        available: stream.totalStreamed - stream.totalWithdrawn,
      };
    }
    
    // Active stream - calculate based on time
    const startTime = new Date(stream.startedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;
    
    // Account for any pause periods
    const pausedSeconds = this.calculatePausedSeconds(stream);
    const activeSeconds = elapsedSeconds - pausedSeconds;
    
    const totalStreamed = activeSeconds * stream.flowRate.perSecond;
    const available = totalStreamed - stream.totalWithdrawn;
    
    return {
      total: Math.min(totalStreamed, stream.funding.wrapped),
      withdrawn: stream.totalWithdrawn,
      available: Math.max(0, available),
    };
  }
  
  calculateRunway(stream: Stream): { seconds: number; display: string; health: StreamHealth } {
    const balance = this.calculateCurrentBalance(stream);
    const remainingFunding = stream.funding.wrapped - balance.total;
    const runwaySeconds = Math.floor(remainingFunding / stream.flowRate.perSecond);
    
    return {
      seconds: runwaySeconds,
      display: formatRunway(runwaySeconds),
      health: calculateHealth(runwaySeconds),
    };
  }
}
```

---

#### Story 5.6: Stream Health Monitor Worker
**Points:** 2  
**Priority:** P1  

**Description:**  
Background job to update stream health and send alerts.

**Acceptance Criteria:**
- [ ] Runs every 5 minutes
- [ ] Recalculates runway for active streams
- [ ] Updates health status
- [ ] Logs health_changed events
- [ ] (Future) Sends webhook notifications

**File:** `lib/workers/stream-health-monitor.ts`

---

## Epic 6: Reports & Documents

### Overview
Implement report generation and export functionality.

### Stories

#### Story 6.1: Documents Database Schema
**Points:** 1  
**Priority:** P1  

**File:** `supabase/migrations/004_reports.sql`

```sql
-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID REFERENCES accounts(id),
  
  type TEXT NOT NULL CHECK (type IN ('statement', 'invoice', 'receipt', 'activity_log')),
  name TEXT NOT NULL,
  
  period_start DATE,
  period_end DATE,
  
  summary JSONB,
  
  format TEXT CHECK (format IN ('pdf', 'csv', 'json')),
  storage_path TEXT,
  
  status TEXT DEFAULT 'ready' CHECK (status IN ('generating', 'ready', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_account ON documents(account_id);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  
  changes JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
```

---

#### Story 6.2: Reports API
**Points:** 2  
**Priority:** P1  

**Description:**  
Implement reports listing and generation.

**Acceptance Criteria:**
- [ ] GET /api/v1/reports lists available reports
- [ ] POST /api/v1/reports/generate creates report
- [ ] Supports date range
- [ ] Supports format selection (PDF, CSV, JSON)

**File:** `app/api/v1/reports/route.ts`

---

#### Story 6.3: Export Service
**Points:** 3  
**Priority:** P1  

**Description:**  
Service to generate exports in various formats.

**Acceptance Criteria:**
- [ ] CSV export for transactions
- [ ] CSV export for streams
- [ ] JSON export for all data types
- [ ] (Stretch) PDF statement generation

**File:** `lib/services/exports.ts`

---

## Epic 7: Dashboard UI

### Overview
Implement the full Partner Dashboard UI, starting from the Figma Make export.

### 7.0 Figma Make Integration Strategy

The UI has been designed in Figma and can be exported via Figma Make as a React project. This gives us a head start but requires cleanup and wiring to real data.

#### What Figma Make Gives Us
```
✅ Component structure (pages, layouts, components)
✅ Styling (Tailwind classes, design tokens)
✅ Static UI (buttons, tables, cards, modals)
✅ Responsive layouts
✅ Dark mode styles

❌ Real data fetching (uses hardcoded/mock data)
❌ State management (no React Query, no Zustand)
❌ API integration (no fetch calls)
❌ Form handling (no validation, no submission)
❌ Proper TypeScript types (may use `any`)
```

#### Integration Steps

**Step 1: Export from Figma Make**
```bash
# Download the React project from Figma Make
# You'll get a zip with structure like:
figma-export/
├── src/
│   ├── components/
│   ├── pages/
│   └── styles/
├── package.json
└── ...
```

**Step 2: Copy Components to Dashboard App**
```bash
# Copy Figma components into the monorepo dashboard
cp -r figma-export/src/components/* apps/dashboard/components/figma/

# Review and reorganize:
# - Move reusable UI components → components/ui/
# - Move page sections → components/{feature}/
# - Move layouts → components/layout/
```

**Step 3: Clean Up Components**

Figma Make components typically need:

| Issue | Fix |
|-------|-----|
| Hardcoded data | Replace with props |
| No TypeScript types | Add proper interfaces |
| Inline styles | Convert to Tailwind (if not already) |
| Static images | Wire to real data or icons |
| No interactivity | Add onClick handlers, state |

**Example cleanup:**

```tsx
// BEFORE: Figma Make export
const AccountCard = () => {
  return (
    <div className="p-4 bg-white rounded-lg">
      <h3>TechCorp Inc</h3>
      <p>$250,000.00</p>
      <span>Verified</span>
    </div>
  );
};

// AFTER: Cleaned up with props and types
import { Account } from '@payos/types';
import { formatCurrency } from '@payos/utils';

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps) {
  return (
    <div 
      className="p-4 bg-white rounded-lg cursor-pointer hover:shadow-md"
      onClick={onClick}
    >
      <h3 className="font-medium">{account.name}</h3>
      <p className="text-2xl font-bold">
        {formatCurrency(account.balance.total, 'USDC')}
      </p>
      <VerificationBadge status={account.verification.status} />
    </div>
  );
}
```

**Step 4: Wire to API**

Replace static data with React Query hooks:

```tsx
// BEFORE: Static data
const AccountsPage = () => {
  const accounts = [
    { name: 'TechCorp', balance: 250000 },
    { name: 'Maria', balance: 5000 },
  ];
  
  return <AccountsList accounts={accounts} />;
};

// AFTER: Real data from API
import { useAccounts } from '@/hooks/use-accounts';

export default function AccountsPage() {
  const { data, isLoading, error } = useAccounts();
  
  if (isLoading) return <AccountsListSkeleton />;
  if (error) return <ErrorState error={error} />;
  
  return <AccountsList accounts={data.data} />;
}
```

**Step 5: Add Missing Interactivity**

Figma exports are visual-only. Add:

```tsx
// Forms with validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Modals with state
const [isOpen, setIsOpen] = useState(false);

// Navigation
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push(`/accounts/${account.id}`);

// Mutations
const createAccount = useCreateAccount();
await createAccount.mutateAsync(formData);
```

#### Recommended File Mapping

| Figma Page | Dashboard Route | Components Needed |
|------------|-----------------|-------------------|
| Accounts List | `/accounts` | AccountsTable, AccountFilters, AccountCard |
| Account Detail | `/accounts/[id]` | AccountHeader, BalanceBreakdown, AccountTabs |
| Agents List | `/agents` | AgentsTable, AgentFilters |
| Agent Detail | `/agents/[id]` | AgentHeader, KYAStatus, AgentTabs |
| Transactions | `/transactions` | TransactionsTable, TransactionFilters, ExportDropdown |
| Reports | `/reports` | ReportsTable, GenerateReportModal |
| New Payment | Modal | PaymentTypeToggle, RecipientSelect, AmountInput, StreamConfig |

#### Component Checklist

For each Figma component, ensure:

- [ ] Props interface defined with proper types
- [ ] Hardcoded strings replaced with props
- [ ] Mock data removed, accepts real data
- [ ] Loading state handled (skeleton or spinner)
- [ ] Error state handled
- [ ] Empty state handled
- [ ] Click handlers wired up
- [ ] Responsive on mobile
- [ ] Accessible (keyboard nav, aria labels)

#### Time Estimate

| Task | Time |
|------|------|
| Export and initial copy | 30 min |
| Reorganize file structure | 1 hour |
| Clean up 20-30 components | 4-6 hours |
| Wire to API (React Query) | 3-4 hours |
| Add forms and validation | 2-3 hours |
| Testing and polish | 2-3 hours |
| **Total** | **12-18 hours** |

This is faster than building from scratch (~40+ hours) but still requires significant work.

---

### Stories

#### Story 7.1: Dashboard Layout
**Points:** 2  
**Priority:** P0  

**Description:**  
Create main layout with sidebar navigation.

**Acceptance Criteria:**
- [ ] Responsive sidebar with all nav items
- [ ] Header with tenant name
- [ ] Dark mode support
- [ ] Mobile-friendly

**Files:**
- `components/layout/DashboardLayout.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`

---

#### Story 7.2: Accounts UI
**Points:** 3  
**Priority:** P0  

**Description:**  
Accounts list and detail pages.

**Acceptance Criteria:**
- [ ] List page with search and type filter
- [ ] Detail page with tabs
- [ ] Overview tab with balance breakdown
- [ ] Transactions tab
- [ ] Streams tab with health badges
- [ ] Agents tab
- [ ] Documents tab

**Files:**
- `app/(dashboard)/accounts/page.tsx`
- `app/(dashboard)/accounts/[id]/page.tsx`
- `components/accounts/*`

---

#### Story 7.3: Agents UI
**Points:** 3  
**Priority:** P0  

**Description:**  
Agents list and detail pages.

**Acceptance Criteria:**
- [ ] List page with parent account column
- [ ] Detail page with tabs
- [ ] Overview with parent account card
- [ ] Streams tab showing managed streams
- [ ] KYA tab with tier info
- [ ] Activity tab

**Files:**
- `app/(dashboard)/agents/page.tsx`
- `app/(dashboard)/agents/[id]/page.tsx`
- `components/agents/*`

---

#### Story 7.4: Transactions UI
**Points:** 2  
**Priority:** P0  

**Description:**  
Transactions list with filters and export.

**Acceptance Criteria:**
- [ ] List with type, status, date filters
- [ ] Search by account
- [ ] Export dropdown (PDF/CSV/JSON)
- [ ] Click to view details

**Files:**
- `app/(dashboard)/transactions/page.tsx`
- `components/payments/TransactionsTable.tsx`

---

#### Story 7.5: New Payment Modal
**Points:** 3  
**Priority:** P0  

**Description:**  
Modal for creating transactions or streams.

**Acceptance Criteria:**
- [ ] Transaction vs Stream toggle
- [ ] Recipient search/select
- [ ] Amount / Flow Rate input
- [ ] Stream options (duration, funding, protection)
- [ ] Per-second rate calculation display
- [ ] Submit creates appropriate resource

**File:** `components/payments/NewPaymentModal.tsx`

---

#### Story 7.6: Reports UI
**Points:** 2  
**Priority:** P1  

**Description:**  
Reports page with export functionality.

**Acceptance Criteria:**
- [ ] Quick export section
- [ ] Report types grid
- [ ] Monthly statements list
- [ ] Download buttons

**Files:**
- `app/(dashboard)/reports/page.tsx`
- `components/reports/ReportsPage.tsx`

---

#### Story 7.7: Stream Components
**Points:** 2  
**Priority:** P0  

**Description:**  
Reusable stream-related components.

**Acceptance Criteria:**
- [ ] StreamHealthBadge (green/amber/red/gray)
- [ ] StreamRunway (days/hours display)
- [ ] BalanceBreakdown (available vs in streams)
- [ ] StreamsTable with all columns

**Files:**
- `components/streams/StreamHealthBadge.tsx`
- `components/streams/StreamRunway.tsx`
- `components/streams/BalanceBreakdown.tsx`
- `components/streams/StreamsTable.tsx`

---

## Epic 8: AI Visibility & Agent Intelligence

### Overview
Make the "AI-native" differentiator visible throughout the application. Currently, agents exist but their intelligence and actions are invisible. This epic adds UI elements that showcase agent activity, AI-generated insights, and autonomous operations.

**Why This Matters:**
- Without visible AI, PayOS looks like "just another payment dashboard"
- Investors/partners need to SEE the AI working, not just hear about it
- The KYA framework is meaningless if agent actions aren't surfaced

### Stories

#### Story 8.1: Enhanced AI Insights Panel
**Points:** 2  
**Priority:** P0  

**Description:**  
Replace generic placeholder insights with specific, actionable AI-generated recommendations.

**Acceptance Criteria:**
- [ ] Insights are specific (mention actual accounts, amounts, corridors)
- [ ] Each insight has a severity (info, warning, success)
- [ ] Actionable insights have a CTA button
- [ ] Insights rotate/update (can be mocked with timer)
- [ ] At least 4-5 insight types

**Mock Data:**
```typescript
// apps/dashboard/lib/mock-data/ai-insights.ts
export const mockAiInsights = [
  {
    id: 'insight-1',
    type: 'treasury_optimization',
    icon: '💡',
    severity: 'info',
    title: 'Treasury Optimization',
    message: 'MXN corridor is 23% over-funded. Consider rebalancing $12,400 to BRL corridor.',
    action: { label: 'Review Treasury', href: '/treasury' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-2',
    type: 'stream_health',
    icon: '⚠️',
    severity: 'warning',
    title: 'Stream Health Alert',
    message: '3 streams will run dry within 48 hours. Auto top-up is disabled for these accounts.',
    action: { label: 'View Streams', href: '/streams?health=critical' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-3',
    type: 'agent_limit',
    icon: '🤖',
    severity: 'info',
    title: 'Agent Limit Warning',
    message: 'Payroll Autopilot has used 87% of monthly limit ($87,000 / $100,000).',
    action: { label: 'Adjust Limits', href: '/agents/payroll-autopilot' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-4',
    type: 'compliance',
    icon: '🛡️',
    severity: 'warning',
    title: 'Compliance Review Needed',
    message: '2 transactions flagged for manual review. Average review time: 4 hours.',
    action: { label: 'Review Flags', href: '/compliance' },
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-5',
    type: 'automation_success',
    icon: '✅',
    severity: 'success',
    title: 'Automation Performing Well',
    message: 'Agents processed 142 transactions today with 99.3% success rate.',
    action: null,
    generatedAt: new Date().toISOString(),
  },
  {
    id: 'insight-6',
    type: 'fx_opportunity',
    icon: '📈',
    severity: 'info',
    title: 'FX Rate Opportunity',
    message: 'USD/BRL rate is 2.1% below 30-day average. Good time for BRL payouts.',
    action: { label: 'View Rates', href: '/treasury' },
    generatedAt: new Date().toISOString(),
  },
];
```

**Component:**
```typescript
// apps/dashboard/components/dashboard/AiInsightsPanel.tsx
interface AiInsight {
  id: string;
  type: string;
  icon: string;
  severity: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  action?: { label: string; href: string };
  generatedAt: string;
}

export function AiInsightsPanel({ insights }: { insights: AiInsight[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold">AI Insights</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Updated {formatRelative(insights[0]?.generatedAt)}
        </span>
      </div>
      <div className="divide-y">
        {insights.slice(0, 4).map((insight) => (
          <div key={insight.id} className={cn(
            "p-4",
            insight.severity === 'warning' && "bg-amber-50 dark:bg-amber-950/20",
            insight.severity === 'success' && "bg-green-50 dark:bg-green-950/20",
          )}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{insight.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{insight.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {insight.message}
                </p>
                {insight.action && (
                  <Link 
                    href={insight.action.href}
                    className="text-sm text-primary hover:underline mt-2 inline-block"
                  >
                    {insight.action.label} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

#### Story 8.2: Agent Performance Dashboard Card
**Points:** 1  
**Priority:** P0  

**Description:**  
Add a prominent card to the dashboard showing aggregate agent performance metrics.

**Acceptance Criteria:**
- [ ] Shows active agents count (e.g., "8 of 14 active")
- [ ] Shows actions processed today
- [ ] Shows success rate percentage
- [ ] Shows volume processed by agents
- [ ] Shows top performing agent
- [ ] Clicking card navigates to /agents

**Mock Data:**
```typescript
// apps/dashboard/lib/mock-data/agent-stats.ts
export const mockAgentStats = {
  activeAgents: 8,
  totalAgents: 14,
  actionsToday: 142,
  actionsTrend: +12, // vs yesterday
  successRate: 99.3,
  failedActions: 1,
  volumeProcessed: 47230,
  volumeCurrency: 'USDC',
  topAgent: {
    id: 'agent-payroll-bot',
    name: 'Payroll Autopilot',
    actions: 67,
    volume: 28500,
  },
  byType: {
    transfers: 89,
    streams: 34,
    topUps: 19,
  },
};
```

**Component:**
```typescript
// apps/dashboard/components/dashboard/AgentPerformanceCard.tsx
export function AgentPerformanceCard({ stats }: { stats: AgentStats }) {
  return (
    <Link href="/agents" className="block">
      <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h3 className="font-semibold">Agent Performance</h3>
          <span className="text-xs text-muted-foreground">Today</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{stats.activeAgents}</p>
            <p className="text-sm text-muted-foreground">
              of {stats.totalAgents} agents active
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.actionsToday}</p>
            <p className="text-sm text-muted-foreground">
              actions today
              {stats.actionsTrend > 0 && (
                <span className="text-green-600 ml-1">+{stats.actionsTrend}%</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.successRate}%</p>
            <p className="text-sm text-muted-foreground">success rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              ${stats.volumeProcessed.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">volume processed</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm">
            <span className="text-muted-foreground">Top agent:</span>{' '}
            <span className="font-medium">{stats.topAgent.name}</span>
            <span className="text-muted-foreground"> ({stats.topAgent.actions} actions)</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
```

---

#### Story 8.3: Agent Activity Feed
**Points:** 3  
**Priority:** P0  

**Description:**  
Add an Activity tab to Agent Detail page showing a timeline of agent actions with reasoning.

**Acceptance Criteria:**
- [ ] Shows chronological list of agent actions
- [ ] Each action shows: timestamp, action type, description, status
- [ ] Actions include AI reasoning where applicable
- [ ] Filter by action type (transfers, streams, compliance)
- [ ] Pagination or "load more"

**Mock Data:**
```typescript
// apps/dashboard/lib/mock-data/agent-activity.ts
export type AgentAction = {
  id: string;
  timestamp: string;
  type: 'transfer' | 'stream_create' | 'stream_topup' | 'stream_pause' | 
        'limit_check' | 'compliance_flag' | 'rebalance';
  status: 'success' | 'failed' | 'pending';
  description: string;
  details: {
    amount?: number;
    currency?: string;
    recipient?: string;
    reference?: string;
  };
  reasoning?: string; // AI explanation
};

export const mockAgentActivity: Record<string, AgentAction[]> = {
  'agent-payroll-bot': [
    {
      id: 'act-1',
      timestamp: '2025-12-12T14:32:00Z',
      type: 'stream_create',
      status: 'success',
      description: 'Created salary stream to Maria Garcia',
      details: {
        amount: 2000,
        currency: 'USDC',
        recipient: 'Maria Garcia',
        reference: 'stream_abc123',
      },
      reasoning: 'Scheduled payroll execution for December. Recipient verified, within daily limits.',
    },
    {
      id: 'act-2',
      timestamp: '2025-12-12T14:31:45Z',
      type: 'limit_check',
      status: 'success',
      description: 'Pre-transfer limit verification',
      details: {},
      reasoning: 'Daily usage: $4,200 of $10,000 limit. Monthly: $42,000 of $100,000. Approved.',
    },
    {
      id: 'act-3',
      timestamp: '2025-12-12T10:15:00Z',
      type: 'stream_topup',
      status: 'success',
      description: 'Auto top-up for Carlos Martinez stream',
      details: {
        amount: 500,
        currency: 'USDC',
        reference: 'stream_def456',
      },
      reasoning: 'Stream runway fell below 7-day threshold. Auto top-up triggered per policy.',
    },
    {
      id: 'act-4',
      timestamp: '2025-12-12T09:00:00Z',
      type: 'transfer',
      status: 'success',
      description: 'Bonus payment to Carlos Martinez',
      details: {
        amount: 500,
        currency: 'USDC',
        recipient: 'Carlos Martinez',
        reference: 'txn_xyz789',
      },
      reasoning: 'Quarterly bonus scheduled. Manager approval obtained via webhook.',
    },
    {
      id: 'act-5',
      timestamp: '2025-12-11T16:45:00Z',
      type: 'compliance_flag',
      status: 'pending',
      description: 'Flagged transaction for review',
      details: {
        amount: 8500,
        reference: 'txn_review123',
      },
      reasoning: 'Transaction exceeds single-payment threshold for T1 recipient. Escalated for manual review.',
    },
  ],
  'agent-treasury': [
    {
      id: 'act-t1',
      timestamp: '2025-12-12T08:00:00Z',
      type: 'rebalance',
      status: 'success',
      description: 'Rebalanced MXN corridor',
      details: {
        amount: 5000,
        currency: 'USDC',
      },
      reasoning: 'MXN corridor utilization at 92%. Moved funds from over-funded BRL corridor (43% utilization).',
    },
  ],
};
```

**Component:**
```typescript
// apps/dashboard/components/agents/AgentActivityFeed.tsx
const actionIcons: Record<string, string> = {
  transfer: '💸',
  stream_create: '🌊',
  stream_topup: '⬆️',
  stream_pause: '⏸️',
  limit_check: '✓',
  compliance_flag: '🚩',
  rebalance: '⚖️',
};

export function AgentActivityFeed({ activities }: { activities: AgentAction[] }) {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div 
          key={activity.id} 
          className={cn(
            "p-4 rounded-lg border",
            activity.status === 'failed' && "border-red-200 bg-red-50",
            activity.status === 'pending' && "border-amber-200 bg-amber-50",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">{actionIcons[activity.type]}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{activity.description}</h4>
                <span className="text-xs text-muted-foreground">
                  {formatRelative(activity.timestamp)}
                </span>
              </div>
              
              {activity.details.amount && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(activity.details.amount, activity.details.currency)}
                  {activity.details.recipient && ` → ${activity.details.recipient}`}
                </p>
              )}
              
              {activity.reasoning && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                  <span className="text-muted-foreground">AI Reasoning: </span>
                  {activity.reasoning}
                </div>
              )}
              
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={activity.status} />
                {activity.details.reference && (
                  <code className="text-xs text-muted-foreground">
                    {activity.details.reference}
                  </code>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

#### Story 8.4: Transaction Attribution Badges
**Points:** 1  
**Priority:** P0  

**Description:**  
Add visual indicators showing whether transactions were initiated by humans or agents.

**Acceptance Criteria:**
- [ ] Transactions table shows "Initiated by" column or badge
- [ ] Badge shows agent name with robot icon for agent-initiated
- [ ] Badge shows "Manual" or user icon for human-initiated
- [ ] Filter dropdown to show only agent-initiated transactions
- [ ] Agent badge links to agent detail page

**Component:**
```typescript
// apps/dashboard/components/transactions/InitiatedByBadge.tsx
interface InitiatedByBadgeProps {
  initiatedBy: {
    type: 'user' | 'agent';
    id: string;
    name: string;
  };
}

export function InitiatedByBadge({ initiatedBy }: InitiatedByBadgeProps) {
  if (initiatedBy.type === 'agent') {
    return (
      <Link 
        href={`/agents/${initiatedBy.id}`}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs hover:bg-purple-200"
      >
        <span>🤖</span>
        <span>{initiatedBy.name}</span>
      </Link>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs">
      <span>👤</span>
      <span>Manual</span>
    </span>
  );
}
```

**Update TransactionsTable:**
```typescript
// Add to columns
{
  header: 'Initiated By',
  cell: ({ row }) => (
    <InitiatedByBadge initiatedBy={row.original.initiatedBy} />
  ),
}

// Add to filters
<Select value={initiatedByFilter} onValueChange={setInitiatedByFilter}>
  <SelectTrigger>
    <SelectValue placeholder="Initiated By" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
    <SelectItem value="agent">Agent</SelectItem>
    <SelectItem value="user">Manual</SelectItem>
  </SelectContent>
</Select>
```

---

#### Story 8.5: Agent Quick Actions
**Points:** 2  
**Priority:** P1  

**Description:**  
Add ability to trigger common agent actions directly from UI (mocked for demo).

**Acceptance Criteria:**
- [ ] "Run Now" button on agent detail triggers immediate action
- [ ] Shows confirmation dialog with estimated outcome
- [ ] After "running", shows success toast with results
- [ ] Updates activity feed with new action

**Component:**
```typescript
// apps/dashboard/components/agents/AgentQuickActions.tsx
export function AgentQuickActions({ agent }: { agent: Agent }) {
  const [isRunning, setIsRunning] = useState(false);
  
  const handleRunNow = async () => {
    setIsRunning(true);
    // Simulate agent processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRunning(false);
    
    toast.success('Agent completed', {
      description: `${agent.name} processed 3 pending payments ($4,500 total)`,
    });
  };
  
  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleRunNow} 
        disabled={isRunning}
        variant="outline"
      >
        {isRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Now
          </>
        )}
      </Button>
      
      <Button variant="outline">
        <Settings className="mr-2 h-4 w-4" />
        Configure
      </Button>
    </div>
  );
}
```

---

## Epic 9: Demo Polish & Missing Features

### Overview
Final polish items and features that surfaced during implementation but are needed for a complete demo experience.

### Stories

#### Story 9.1: Reports Page Implementation
**Points:** 2  
**Priority:** P0  

**Description:**  
Wire up the Reports stub page to the actual API.

**Acceptance Criteria:**
- [ ] List existing reports from API
- [ ] Generate new report form (type, date range, format)
- [ ] Download report (CSV/PDF)
- [ ] Show report generation status

**Files:**
- `apps/dashboard/app/(dashboard)/reports/page.tsx`
- `apps/dashboard/components/reports/ReportsTable.tsx`
- `apps/dashboard/components/reports/GenerateReportModal.tsx`

---

#### Story 9.2: Streams Page Verification
**Points:** 1  
**Priority:** P0  

**Description:**  
Verify streams list page works with real data and all actions function.

**Acceptance Criteria:**
- [ ] List shows all streams with health badges
- [ ] Click into stream shows detail with real-time balance
- [ ] Pause/Resume buttons work
- [ ] Cancel button works with confirmation
- [ ] Top-up modal works

---

#### Story 9.3: Empty States
**Points:** 1  
**Priority:** P1  

**Description:**  
Add meaningful empty states for all list pages.

**Acceptance Criteria:**
- [ ] Accounts empty state with "Create Account" CTA
- [ ] Agents empty state with "Register Agent" CTA
- [ ] Streams empty state with "Create Stream" CTA
- [ ] Transactions empty state
- [ ] Empty states include helpful illustration/icon

**Component:**
```typescript
// apps/dashboard/components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage
<EmptyState
  icon="🤖"
  title="No agents yet"
  description="Register your first AI agent to automate payments and treasury operations."
  action={{ label: 'Register Agent', onClick: () => setShowCreateModal(true) }}
/>
```

---

#### Story 9.4: Loading Skeletons
**Points:** 1  
**Priority:** P1  

**Description:**  
Add skeleton loading states for all data-fetching components.

**Acceptance Criteria:**
- [ ] Table skeleton for lists
- [ ] Card skeleton for dashboard cards
- [ ] Detail page skeleton
- [ ] Skeletons match actual component layouts

---

#### Story 9.5: Error States
**Points:** 1  
**Priority:** P1  

**Description:**  
Add error handling UI for API failures.

**Acceptance Criteria:**
- [ ] Error boundary at page level
- [ ] Retry button on error states
- [ ] Toast notifications for action failures
- [ ] Graceful degradation (show cached data if available)

---

#### Story 9.6: Global Search Enhancement
**Points:** 2  
**Priority:** P1  

**Description:**  
Make the ⌘K search actually functional with mock results.

**Acceptance Criteria:**
- [ ] Search modal opens on ⌘K / Ctrl+K
- [ ] Search across accounts, agents, transactions
- [ ] Shows categorized results
- [ ] Keyboard navigation
- [ ] Recent searches

**Component:**
```typescript
// apps/dashboard/components/search/GlobalSearch.tsx
const mockSearchResults = {
  accounts: [
    { id: 'acc-1', name: 'TechCorp Inc', type: 'business' },
    { id: 'acc-2', name: 'Maria Garcia', type: 'person' },
  ],
  agents: [
    { id: 'agent-1', name: 'Payroll Autopilot', status: 'active' },
  ],
  transactions: [
    { id: 'txn-1', description: 'Payment to Maria', amount: 2000 },
  ],
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  // Filter mock results based on query
  const results = useMemo(() => {
    if (!query) return null;
    // ... filter logic
  }, [query]);
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search accounts, agents, transactions..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {results?.accounts?.length > 0 && (
          <CommandGroup heading="Accounts">
            {results.accounts.map(acc => (
              <CommandItem key={acc.id}>
                <Building className="mr-2 h-4 w-4" />
                {acc.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {/* Similar for agents, transactions */}
      </CommandList>
    </CommandDialog>
  );
}
```

---

#### Story 9.7: Notifications Center
**Points:** 2  
**Priority:** P2  

**Description:**  
Add a notifications dropdown showing recent system events.

**Acceptance Criteria:**
- [ ] Bell icon in header with unread count
- [ ] Dropdown shows recent notifications
- [ ] Notification types: agent actions, stream alerts, compliance flags
- [ ] Mark as read functionality
- [ ] Link to relevant page

**Mock Data:**
```typescript
export const mockNotifications = [
  {
    id: 'notif-1',
    type: 'agent_action',
    title: 'Payroll Autopilot',
    message: 'Completed 12 scheduled payments',
    timestamp: '5 minutes ago',
    read: false,
    href: '/agents/payroll-autopilot',
  },
  {
    id: 'notif-2',
    type: 'stream_alert',
    title: 'Stream Health Warning',
    message: 'Stream to Carlos Martinez has < 48h runway',
    timestamp: '1 hour ago',
    read: false,
    href: '/streams/stream-123',
  },
  {
    id: 'notif-3',
    type: 'compliance',
    title: 'Review Required',
    message: 'Transaction #TXN-456 flagged for review',
    timestamp: '2 hours ago',
    read: true,
    href: '/compliance',
  },
];
```

---

#### Story 9.8: Real-Time Balance Animation
**Points:** 1  
**Priority:** P2  

**Description:**  
Add visual animation showing stream balances updating in real-time.

**Acceptance Criteria:**
- [ ] Balance numbers animate/tick up smoothly
- [ ] Visual indicator showing "live" status
- [ ] Works on stream detail page
- [ ] Works on account balance breakdown

**Component:**
```typescript
// apps/dashboard/components/ui/AnimatedNumber.tsx
export function AnimatedNumber({ 
  value, 
  duration = 500,
  formatFn = (n) => n.toFixed(2),
}: { 
  value: number; 
  duration?: number;
  formatFn?: (n: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const start = displayValue;
    const end = value;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span>{formatFn(displayValue)}</span>;
}

// Usage for streaming balance
function StreamBalance({ stream }) {
  const [balance, setBalance] = useState(stream.currentBalance);
  
  useEffect(() => {
    // Update balance every second based on flow rate
    const interval = setInterval(() => {
      setBalance(prev => prev + stream.flowRate.perSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [stream.flowRate.perSecond]);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold">
        $<AnimatedNumber value={balance} />
      </span>
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Live
      </span>
    </div>
  );
}
```

---

## Epic 10: PSP Table Stakes Features

### Overview

Based on a16z's analysis of fintech infrastructure, partners expect card-like capabilities on stablecoin rails. Without these features, partners must build workarounds or reject PayOS entirely. This epic adds the minimum viable implementations needed for partner credibility.

**Why This Matters:**
- Refunds: Partners need to handle failed payouts, disputes, overpayments
- Subscriptions: B2B SaaS, contractor retainers, recurring payouts are common
- Payment Methods: "Card on file" equivalent for repeat payments
- Disputes: Even without full arbitration, partners need status tracking
- Exports: CFOs need reconciliation with QuickBooks, Xero, NetSuite

**Design Principle:** Currency Transparency
PayOS does NOT abstract currencies. We show exactly what stablecoin/currency is being used. Partners may choose to abstract for their end users, but infrastructure should be honest about what's moving.

### Stories

#### Story 10.1: Refunds API
**Points:** 3  
**Priority:** P0  

**Description:**  
Implement refund creation and management for completed transfers.

**Acceptance Criteria:**
- [ ] `POST /v1/refunds` creates refund for completed transfer
- [ ] Supports full and partial refunds
- [ ] Multiple partial refunds allowed up to original amount
- [ ] Balance check before processing
- [ ] 90-day default time limit (configurable per tenant)
- [ ] `GET /v1/refunds` with filtering by status, account, date
- [ ] `GET /v1/refunds/:id` for refund details
- [ ] Webhook events: `refund.created`, `refund.completed`, `refund.failed`

**Database Schema:**
```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  original_transfer_id UUID NOT NULL REFERENCES transfers(id),
  
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, completed, failed
  amount NUMERIC(20,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  
  reason TEXT NOT NULL,  -- duplicate_payment, service_not_rendered, customer_request, error, other
  reason_details TEXT,
  
  from_account_id UUID NOT NULL REFERENCES accounts(id),
  to_account_id UUID NOT NULL REFERENCES accounts(id),
  
  idempotency_key TEXT UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- On-chain tracking (Phase 3)
  network TEXT,
  tx_hash TEXT
);

CREATE INDEX idx_refunds_tenant ON refunds(tenant_id);
CREATE INDEX idx_refunds_original ON refunds(original_transfer_id);
CREATE INDEX idx_refunds_status ON refunds(tenant_id, status);
```

**API Implementation:**
```typescript
// apps/api/src/routes/refunds.ts
import { Hono } from 'hono';

const refunds = new Hono();

// POST /v1/refunds
refunds.post('/', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();
  
  // Validate original transfer exists and is completed
  const { data: transfer } = await supabase
    .from('transfers')
    .select('*')
    .eq('id', body.original_transfer_id)
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'completed')
    .single();
  
  if (!transfer) {
    return c.json({ error: 'Transfer not found or not refundable' }, 400);
  }
  
  // Check time limit (90 days default)
  const daysSinceTransfer = daysBetween(transfer.completed_at, new Date());
  if (daysSinceTransfer > 90) {
    return c.json({ error: 'Refund window expired (90 days)' }, 400);
  }
  
  // Calculate refund amount
  const amount = body.amount || transfer.amount;
  
  // Check for existing refunds
  const { data: existingRefunds } = await supabase
    .from('refunds')
    .select('amount')
    .eq('original_transfer_id', transfer.id)
    .eq('status', 'completed');
  
  const totalRefunded = existingRefunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
  if (totalRefunded + amount > transfer.amount) {
    return c.json({ 
      error: 'Refund amount exceeds remaining refundable amount',
      remaining: transfer.amount - totalRefunded 
    }, 400);
  }
  
  // Check source account balance
  const { data: sourceAccount } = await supabase
    .from('accounts')
    .select('balance_available')
    .eq('id', transfer.to_account_id)
    .single();
  
  if (sourceAccount.balance_available < amount) {
    return c.json({ error: 'Insufficient balance for refund' }, 400);
  }
  
  // Create refund (reverse the original transfer direction)
  const { data: refund } = await supabase
    .from('refunds')
    .insert({
      tenant_id: ctx.tenantId,
      original_transfer_id: transfer.id,
      amount,
      currency: transfer.currency,
      reason: body.reason,
      reason_details: body.reason_details,
      from_account_id: transfer.to_account_id,  // Reverse
      to_account_id: transfer.from_account_id,  // Reverse
      idempotency_key: body.idempotency_key,
    })
    .select()
    .single();
  
  // Process refund (update balances, create ledger entries)
  await processRefund(refund);
  
  return c.json({ data: refund }, 201);
});

export default refunds;
```

---

#### Story 10.2: Scheduled Transfers API
**Points:** 3  
**Priority:** P0  

**Description:**  
Extend transfers API to support recurring/scheduled payments.

**Acceptance Criteria:**
- [ ] `POST /v1/transfers` accepts `schedule` object for recurring
- [ ] Supports frequencies: daily, weekly, biweekly, monthly, custom
- [ ] Start date, end date, max occurrences options
- [ ] `GET /v1/transfers/:id/schedule` returns schedule details and history
- [ ] `POST /v1/transfers/:id/pause` pauses scheduled transfer
- [ ] `POST /v1/transfers/:id/resume` resumes scheduled transfer
- [ ] `POST /v1/transfers/:id/cancel` cancels remaining executions
- [ ] Background worker executes scheduled transfers
- [ ] Webhook events for scheduled transfer lifecycle

**Database Schema:**
```sql
-- Extend transfers table
ALTER TABLE transfers ADD COLUMN schedule_id UUID REFERENCES transfer_schedules(id);
ALTER TABLE transfers ADD COLUMN scheduled_for TIMESTAMPTZ;

CREATE TABLE transfer_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Template for each execution
  from_account_id UUID NOT NULL REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  to_payment_method_id UUID REFERENCES payment_methods(id),
  amount NUMERIC(20,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  description TEXT,
  
  -- Schedule config
  frequency TEXT NOT NULL,  -- daily, weekly, biweekly, monthly, custom
  interval_value INTEGER DEFAULT 1,
  day_of_month INTEGER,  -- 1-31 for monthly
  day_of_week INTEGER,   -- 0-6 for weekly (0=Sunday)
  timezone TEXT DEFAULT 'UTC',
  
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',  -- active, paused, completed, cancelled
  
  -- Tracking
  occurrences_completed INTEGER DEFAULT 0,
  next_execution TIMESTAMPTZ,
  last_execution TIMESTAMPTZ,
  
  -- Retry config
  retry_enabled BOOLEAN DEFAULT true,
  max_retry_attempts INTEGER DEFAULT 3,
  retry_window_days INTEGER DEFAULT 14,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_schedules_next ON transfer_schedules(next_execution) 
  WHERE status = 'active';
```

**Retry Configuration:**
```typescript
interface RetryConfig {
  enabled: boolean;                    // Default: true
  max_attempts: number;                // Default: 3
  max_window_days: number;             // Default: 14
  retry_intervals_hours: number[];     // Default: [24, 48, 96]
  cancel_on_hard_decline: boolean;     // Default: true
  skip_if_rate_changed: number;        // Default: 0.02 (2%)
}
```

**Webhook Events:**
```typescript
scheduled_transfer.created
scheduled_transfer.executed
scheduled_transfer.failed
scheduled_transfer.retry_scheduled
scheduled_transfer.retry_succeeded
scheduled_transfer.exhausted        // All retries failed
scheduled_transfer.paused
scheduled_transfer.resumed
scheduled_transfer.cancelled
scheduled_transfer.completed        // All occurrences done
```

---

#### Story 10.3: Payment Methods API
**Points:** 2  
**Priority:** P1  

**Description:**  
Implement stored payment methods (card-on-file equivalent) for accounts.

**Acceptance Criteria:**
- [ ] `POST /v1/accounts/:id/payment-methods` creates payment method
- [ ] Supports types: bank_account, wallet, card
- [ ] `GET /v1/accounts/:id/payment-methods` lists methods
- [ ] `DELETE /v1/accounts/:id/payment-methods/:pm_id` removes method
- [ ] `PATCH` to set default payment method
- [ ] Transfers can use `to_payment_method_id` instead of `to_account_id`
- [ ] Sensitive data masked after creation

**Database Schema:**
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  
  type TEXT NOT NULL,  -- bank_account, wallet, card
  label TEXT,          -- User-friendly name
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- Bank account details (encrypted/masked)
  bank_country TEXT,
  bank_currency TEXT,
  bank_account_last_four TEXT,
  bank_routing_last_four TEXT,
  bank_name TEXT,
  bank_account_holder TEXT,
  
  -- Wallet details
  wallet_network TEXT,  -- base, polygon, ethereum
  wallet_address TEXT,
  
  -- Card reference (if partner issues cards)
  card_id TEXT,
  card_last_four TEXT,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_methods_account ON payment_methods(account_id);
```

**Implementation Status:**
- ✅ Database schema created
- ✅ API routes implemented (stubbed)
- ✅ Mock verification (2-second delay)
- ⚠️ **TODO: Real Integrations Required:**
  - **Bank Accounts:** Integrate with Plaid or Stripe for account verification
  - **Wallets:** Implement wallet address validation and signature verification
  - **Cards:** Integrate with card network APIs if partners issue cards
  - **Verification:** Replace mock verification with real micro-deposits/signature challenges
  - **Encryption:** Encrypt sensitive payment method data at rest
  - **PCI Compliance:** Ensure card data handling meets PCI DSS requirements

---

#### Story 10.4: Disputes API ✅
**Points:** 2  
**Priority:** P1  
**Status:** Complete

**Description:**  
Implement dispute tracking (PayOS tracks status, partners handle resolution).

**Acceptance Criteria:**
- [x] `POST /v1/disputes` creates dispute for a transfer
- [x] `GET /v1/disputes` lists disputes with filtering
- [x] `GET /v1/disputes/:id` returns dispute details
- [x] `POST /v1/disputes/:id/respond` submits respondent evidence
- [x] `POST /v1/disputes/:id/resolve` resolves dispute
- [x] `POST /v1/disputes/:id/escalate` escalates dispute
- [x] `GET /v1/disputes/stats/summary` returns dispute statistics
- [x] 120-day filing window (configurable)
- [x] 30-day response window (configurable)
- [x] Due date tracking and filtering
- [ ] Webhook events for dispute lifecycle

**Database Schema:**
```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  transfer_id UUID NOT NULL REFERENCES transfers(id),
  
  status TEXT NOT NULL DEFAULT 'open',  -- open, under_review, resolved, escalated
  
  reason TEXT NOT NULL,  -- service_not_received, duplicate_charge, unauthorized, amount_incorrect, other
  description TEXT,
  
  claimant_account_id UUID NOT NULL REFERENCES accounts(id),
  respondent_account_id UUID NOT NULL REFERENCES accounts(id),
  
  amount_disputed NUMERIC(20,8) NOT NULL,
  requested_resolution TEXT,  -- full_refund, partial_refund, credit, other
  requested_amount NUMERIC(20,8),
  
  -- Resolution
  resolution TEXT,  -- refund_issued, partial_refund, no_action, credit_issued
  resolution_amount NUMERIC(20,8),
  resolution_notes TEXT,
  refund_id UUID REFERENCES refunds(id),
  
  -- Evidence
  claimant_evidence JSONB DEFAULT '[]',
  respondent_evidence JSONB DEFAULT '[]',
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,  -- Response deadline
  resolved_at TIMESTAMPTZ,
  
  -- Config (from tenant settings)
  filing_window_days INTEGER DEFAULT 120,
  response_window_days INTEGER DEFAULT 30
);

CREATE INDEX idx_disputes_tenant ON disputes(tenant_id);
CREATE INDEX idx_disputes_status ON disputes(tenant_id, status);
CREATE INDEX idx_disputes_due ON disputes(due_date) WHERE status IN ('open', 'under_review');
```

**Webhook Events:**
```typescript
dispute.created
dispute.evidence_submitted
dispute.escalated
dispute.resolved
```

---

#### Story 10.5: Transaction Exports API
**Points:** 2  
**Priority:** P0  

**Description:**  
Implement transaction exports for accounting system reconciliation.

**Acceptance Criteria:**
- [ ] `GET /v1/exports/transactions` generates export
- [ ] Supports formats: quickbooks, quickbooks4, xero, netsuite, payos (full)
- [ ] Date range filtering
- [ ] Include/exclude: refunds, streams, fees
- [ ] Filter by account, corridor, currency
- [ ] Async processing for large exports (>10k records)
- [ ] Download URL with expiration
- [ ] Webhook `export.ready` for async exports

**Export Formats:**

**QuickBooks 3-Column:**
```csv
Date,Description,Amount
01/15/2025,"Payout to Maria Garcia (TXN-ABC123)",-2000.00
01/15/2025,"Refund from Maria Garcia (REF-DEF456)",150.00
```

**Xero:**
```csv
*Date,*Amount,Payee,Description,Reference
15/01/2025,-2000.00,"Maria Garcia","Monthly salary payout","TXN-ABC123"
```

**PayOS Full:**
```csv
date,time_utc,transaction_id,type,status,from_account_id,from_account_name,to_account_id,to_account_name,amount,currency,usd_equivalent,destination_amount,destination_currency,fx_rate,fee_amount,net_amount,corridor,description,initiated_by_type,initiated_by_id
```

**API:**
```typescript
// GET /v1/exports/transactions
const params = {
  start_date: '2025-01-01',
  end_date: '2025-01-31',
  format: 'quickbooks',  // quickbooks, quickbooks4, xero, netsuite, payos
  date_format: 'US',     // US (MM/DD) or UK (DD/MM)
  include_refunds: true,
  include_streams: true,
  include_fees: true,
  account_id: 'acc_xyz',
  corridor: 'US-MX',
  currency: 'USDC'
};

// Response
{
  "export_id": "exp_abc123",
  "status": "ready",  // or "processing"
  "format": "quickbooks",
  "record_count": 1247,
  "download_url": "https://api.payos.dev/exports/exp_abc123/download",
  "expires_at": "2025-02-01T00:00:00Z"
}
```

---

#### Story 10.6: Summary Reports API ✅
**Points:** 1  
**Priority:** P1  
**Status:** Complete

**Description:**  
Implement period summary endpoint for dashboard and reporting.

**Acceptance Criteria:**
- [x] `GET /v1/reports/summary` returns period summary
- [x] Configurable period (day, week, month, custom range)
- [x] Totals: balances, transfers volume, fees
- [x] Streaming metrics: active count, monthly outflow, total streamed

**Response:**
```typescript
{
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "totals": {
    "transfers_out": 125000.00,
    "transfers_in": 50000.00,
    "refunds_issued": 3500.00,
    "fees_paid": 125.00,
    "streams_active": 45,
    "streams_total_flowed": 22500.00
  },
  "by_corridor": [
    { "corridor": "US→MX", "volume": 75000.00, "count": 150 },
    { "corridor": "US→CO", "volume": 35000.00, "count": 85 }
  ],
  "by_account_type": [
    { "type": "business", "volume": 125000.00 },
    { "type": "person", "volume": 50000.00 }
  ]
}
```

---

#### Story 10.7: Refunds UI
**Points:** 2  
**Priority:** P0  

**Description:**  
Add refund capabilities to the dashboard.

**Acceptance Criteria:**
- [ ] "Issue Refund" button on transaction detail (completed transfers only)
- [ ] Refund modal: amount (pre-filled), reason dropdown, notes
- [ ] Partial refund support with remaining balance display
- [ ] Refunds list view (tab in Transactions page)
- [ ] Refund badge on original transaction in history
- [ ] Link between original transaction and refund

**Components:**
- `apps/dashboard/components/refunds/IssueRefundModal.tsx`
- `apps/dashboard/components/refunds/RefundsTable.tsx`
- `apps/dashboard/components/refunds/RefundBadge.tsx`

---

#### Story 10.8: Scheduled Transfers UI
**Points:** 2  
**Priority:** P0  

**Description:**  
Add recurring payment capabilities to the dashboard.

**Acceptance Criteria:**
- [ ] "Make Recurring" toggle in New Payment modal
- [ ] Schedule config: frequency, start date, end date, max occurrences
- [ ] Scheduled Transfers page listing active schedules
- [ ] Schedule card: amount, frequency, next execution, recipient, status
- [ ] Actions: Pause, Resume, Cancel
- [ ] Execution history on schedule detail

**Components:**
- `apps/dashboard/components/payments/ScheduleConfig.tsx`
- `apps/dashboard/app/(dashboard)/scheduled/page.tsx`
- `apps/dashboard/components/scheduled/ScheduleCard.tsx`
- `apps/dashboard/components/scheduled/ScheduleActions.tsx`

---

#### Story 10.9: Payment Methods UI ✅
**Points:** 1  
**Priority:** P1  
**Status:** Complete

**Description:**  
Add payment method management to account detail.

**Acceptance Criteria:**
- [x] "Payment Methods" tab on Account Detail page
- [x] List saved methods (bank accounts, wallets)
- [x] Add new method modal (type selector, form fields)
- [x] Set default action
- [x] Delete method action
- [x] Verification status indicator (Verified/Pending badges)

**Components:**
- `apps/dashboard/components/accounts/PaymentMethodsTab.tsx`
- `apps/dashboard/components/accounts/AddPaymentMethodModal.tsx`
- `apps/dashboard/components/accounts/PaymentMethodCard.tsx`

---

#### Story 10.10: Disputes UI ✅
**Points:** 2  
**Priority:** P1  
**Status:** Complete

**Description:**  
Add dispute management to the dashboard.

**Acceptance Criteria:**
- [x] Disputes page with dedicated sidebar navigation
- [x] Disputes queue with status badges (Open, Under Review, Escalated, Resolved)
- [x] Status summary cards with counts and "At Risk" amount
- [x] Dispute detail slide-over: transaction summary, parties, claim details
- [x] Response submission for respondent
- [x] Resolution actions for partner admin (Resolve, Escalate)
- [x] Due date warnings ("X days left", alert banner for due soon)

**Components:**
- `apps/dashboard/app/(dashboard)/disputes/page.tsx`
- `apps/dashboard/components/disputes/DisputesQueue.tsx`
- `apps/dashboard/components/disputes/DisputeDetail.tsx`
- `apps/dashboard/components/disputes/ResolveDisputeModal.tsx`

---

#### Story 10.11: Exports UI
**Points:** 1  
**Priority:** P0  

**Description:**  
Add export capabilities to transactions page.

**Acceptance Criteria:**
- [ ] Export button on Transactions page header
- [ ] Export modal: date range, format dropdown, include toggles
- [ ] Format options: QuickBooks, Xero, NetSuite, PayOS Full
- [ ] Download link or "Processing..." for large exports
- [ ] Settings page for default export format preference

**Components:**
- `apps/dashboard/components/exports/ExportModal.tsx`
- `apps/dashboard/components/exports/FormatSelector.tsx`

---

#### Story 10.12: Tenant Settings API
**Points:** 1  
**Priority:** P1  

**Description:**  
Add tenant-level configuration for PSP features.

**Acceptance Criteria:**
- [ ] `GET /v1/settings` returns tenant settings
- [ ] `PATCH /v1/settings/retry` updates retry configuration
- [ ] `PATCH /v1/settings/disputes` updates dispute configuration
- [ ] `PATCH /v1/settings/exports` updates export preferences

**Settings Schema:**
```typescript
interface TenantSettings {
  retry: {
    enabled: boolean;
    max_attempts: number;
    max_window_days: number;
    retry_intervals_hours: number[];
    skip_if_rate_changed: number;
  };
  disputes: {
    filing_window_days: number;
    response_window_days: number;
    auto_escalate_after_days: number;
  };
  exports: {
    default_format: string;
    date_format: 'US' | 'UK';
  };
  refunds: {
    window_days: number;
  };
}
```

---

### Epic 10 Summary

| Story | Priority | Points | API | UI |
|-------|----------|--------|-----|-----|
| 10.1 Refunds API | P0 | 3 | ✅ | |
| 10.2 Scheduled Transfers API | P0 | 3 | ✅ | |
| 10.3 Payment Methods API | P1 | 2 | ✅ | |
| 10.4 Disputes API | P1 | 2 | ✅ | |
| 10.5 Transaction Exports API | P0 | 2 | ✅ | |
| 10.6 Summary Reports API | P1 | 1 | ✅ | |
| 10.7 Refunds UI | P0 | 2 | | ✅ |
| 10.8 Scheduled Transfers UI | P0 | 2 | | ✅ |
| 10.9 Payment Methods UI | P1 | 1 | | ✅ |
| 10.10 Disputes UI | P1 | 2 | | ✅ |
| 10.11 Exports UI | P0 | 1 | | ✅ |
| 10.12 Tenant Settings API | P1 | 1 | ✅ | |
| **Total** | | **22** | | |

---

## Epic 11: Authentication & User Management

### Overview

This epic implements proper authentication and user management for PayOS, leveraging Supabase Auth for dashboard login while maintaining API key access for programmatic integrations. Key design decisions:

- **Self-service signup** for new tenants (organizations)
- **Admin-managed invites** for team members
- **One user = one tenant** (no multi-tenant users for now)
- **Full-access API keys** with environment separation (test/live)
- **Supabase Auth** for dashboard login (email/password, with future SSO support)

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tenant creation | Self-service signup | Lower friction for onboarding |
| Multi-tenant users | No (single tenant per user) | Simplifies permissions, can add later |
| API key scopes | Full access only | Simpler MVP; granular scopes as TODO |
| Key expiration | Optional | Security best practice for regulated fintechs |
| Environment separation | Separate test/live keys | Standard fintech pattern |

### Data Model

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│   tenants    │ 1─n │  user_profiles   │     │      api_keys        │
│──────────────│     │──────────────────│     │──────────────────────│
│ id           │──┐  │ id (=auth.users) │     │ id                   │
│ name         │  │  │ tenant_id ───────│──┐  │ tenant_id ───────────│─┐
│ status       │  │  │ role             │  │  │ created_by_user_id   │ │
│ settings     │  │  │ name             │  │  │ name                 │ │
└──────────────┘  │  │ permissions      │  │  │ environment          │ │
                  │  │ invited_by_id    │  │  │ key_prefix           │ │
                  │  │ invite_accepted  │  │  │ key_hash             │ │
                  │  └──────────────────┘  │  │ status               │ │
                  │           │            │  │ last_used_at         │ │
                  │           ▼            │  │ expires_at           │ │
                  │  ┌──────────────────┐  │  └──────────────────────┘ │
                  │  │   auth.users     │  │                           │
                  │  │ (Supabase)       │  │                           │
                  │  │──────────────────│  │                           │
                  │  │ id               │  │                           │
                  │  │ email            │  │                           │
                  │  │ encrypted_pw     │  │                           │
                  │  └──────────────────┘  │                           │
                  │                        │                           │
                  └────────────────────────┴───────────────────────────┘
```

---

### Story 11.1: User Profiles & API Keys Tables

**Priority:** P0  
**Estimate:** 2 hours

#### Description
Create the database tables for user profiles (linking Supabase auth.users to tenants) and API keys (multiple keys per tenant with environment separation).

#### Database Schema

```sql
-- User profiles: links auth.users to tenants
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  name TEXT,
  permissions JSONB DEFAULT '{}',
  invited_by_user_id UUID REFERENCES auth.users(id),
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id) -- One tenant per user for now
);

-- API keys: multiple keys per tenant
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  environment TEXT NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'live')),
  key_prefix TEXT NOT NULL,              -- First 12 chars for lookup
  key_hash TEXT NOT NULL,                -- SHA-256 hash
  -- scopes TEXT[] DEFAULT ARRAY['*'],   -- TODO: Granular scopes
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used_at TIMESTAMPTZ,
  last_used_ip TEXT,
  expires_at TIMESTAMPTZ,                -- Optional expiration
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID REFERENCES auth.users(id),
  revoked_reason TEXT
);

-- Indexes
CREATE INDEX idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix) WHERE status = 'active';
CREATE INDEX idx_api_keys_environment ON api_keys(tenant_id, environment);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY user_profiles_own ON user_profiles
  FOR ALL USING (id = auth.uid());

-- API keys visible to users of the same tenant
CREATE POLICY api_keys_tenant ON api_keys
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );
```

#### Implementation Details

**Migration File:** `supabase/migrations/YYYYMMDDHHMMSS_create_user_profiles_and_api_keys.sql`

```sql
-- ============================================
-- User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  name TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  invited_by_user_id UUID REFERENCES auth.users(id),
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_failed_login_at TIMESTAMPTZ,
  last_failed_login_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT user_profiles_one_tenant_per_user UNIQUE (id, tenant_id)
);

-- ============================================
-- API Keys Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  environment TEXT NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'live')),
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used_at TIMESTAMPTZ,
  last_used_ip TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID REFERENCES auth.users(id),
  revoked_reason TEXT,
  CONSTRAINT api_keys_unique_prefix UNIQUE (key_prefix)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_invite_token ON public.user_profiles(invite_token) WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON public.api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_api_keys_environment ON public.api_keys(tenant_id, environment);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON public.api_keys(created_by_user_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can only see their own profile
DROP POLICY IF EXISTS user_profiles_own ON public.user_profiles;
CREATE POLICY user_profiles_own ON public.user_profiles
  FOR ALL
  USING (id = auth.uid());

-- API keys: Users can see keys for their tenant
DROP POLICY IF EXISTS api_keys_tenant ON public.api_keys;
CREATE POLICY api_keys_tenant ON public.api_keys
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Verification Queries:**

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'api_keys');

-- Verify foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('user_profiles', 'api_keys');

-- Verify indexes
SELECT indexname, indexdef FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'api_keys');

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'api_keys');
```

#### Acceptance Criteria
- [ ] `user_profiles` table created with proper foreign keys
- [ ] `api_keys` table created with environment separation
- [ ] RLS policies enforce tenant isolation
- [ ] Indexes optimized for key lookup
- [ ] Migration file created and tested
- [ ] All constraints verified with test queries

---

### Story 11.2: Self-Service Signup Flow

**Priority:** P0  
**Estimate:** 3 hours

#### Description
Implement self-service signup where a new user creates an account and organization in one flow.

#### API Endpoints

```
POST /v1/auth/signup
```

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "SecureP@ss123",
  "organizationName": "Acme Fintech",
  "userName": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@acme.com",
    "name": "John Doe"
  },
  "tenant": {
    "id": "uuid",
    "name": "Acme Fintech"
  },
  "apiKeys": {
    "test": {
      "key": "pk_test_abc123...",  // Shown ONCE
      "prefix": "pk_test_abc1"
    },
    "live": {
      "key": "pk_live_xyz789...",  // Shown ONCE
      "prefix": "pk_live_xyz7"
    }
  },
  "session": {
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

#### Flow
1. Validate email not already registered
2. Create auth.users via Supabase Auth
3. Create tenant record
4. Create user_profiles linking user to tenant (role: owner)
5. Generate test + live API keys
6. Create tenant_settings with defaults
7. Return keys (shown once, user must save)
8. Send welcome email with getting started guide

#### Implementation Details

**File:** `apps/api/src/routes/auth.ts`

**Zod Schema:**
```typescript
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(12).max(128),
  organizationName: z.string().min(1).max(255),
  userName: z.string().min(1).max(255).optional(),
});
```

**Helper Functions (create `apps/api/src/utils/auth.ts`):**
```typescript
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { createClient } from '../db/client.js';

// Password validation
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '12345678', 'qwerty', 'abc123',
  // Add top 10k from https://github.com/danielmiessler/SecLists
]);

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check against common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a more unique password');
  }
  
  return { valid: errors.length === 0, errors };
}

// Generate API key
export function generateApiKey(environment: 'test' | 'live'): string {
  const random = randomBytes(32).toString('base64url');
  return `pk_${environment}_${random}`;
}

// Hash API key (SHA-256)
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Get key prefix (first 12 chars)
export function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

// Constant-time comparison
export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    // Still do comparison to maintain constant time
    timingSafeEqual(bufA, bufA);
    return false;
  }
  
  return timingSafeEqual(bufA, bufB);
}

// Rate limiting check
export async function checkRateLimit(
  key: string,
  windowMs: number,
  maxAttempts: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  // Implementation using Redis or in-memory store
  // For MVP, use simple in-memory Map
  // TODO: Replace with Redis for production
  const store = new Map<string, { count: number; resetAt: Date }>();
  
  const now = new Date();
  const record = store.get(key);
  
  if (!record || now > record.resetAt) {
    const resetAt = new Date(now.getTime() + windowMs);
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxAttempts - 1, resetAt };
  }
  
  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count, resetAt: record.resetAt };
}

// Log security event
export async function logSecurityEvent(
  eventType: string,
  severity: 'info' | 'warning' | 'critical',
  details: Record<string, any>
): Promise<void> {
  const supabase = createClient();
  await supabase.from('security_events').insert({
    event_type: eventType,
    severity,
    ip_address: details.ip,
    user_agent: details.userAgent,
    details: details,
  });
}
```

**Route Handler:**
```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { createAdminClient } from '../db/admin-client.js'; // Supabase admin client
import { ValidationError } from '../middleware/error.js';
import {
  validatePassword,
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  checkRateLimit,
  logSecurityEvent,
} from '../utils/auth.js';

const auth = new Hono();

const signupSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(12).max(128),
  organizationName: z.string().min(1).max(255),
  userName: z.string().min(1).max(255).optional(),
});

auth.post('/signup', async (c) => {
  try {
    // Rate limiting
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 
               c.req.header('x-real-ip') || 
               'unknown';
    const rateLimit = await checkRateLimit(`signup:${ip}`, 60 * 60 * 1000, 10);
    if (!rateLimit.allowed) {
      await logSecurityEvent('signup_rate_limited', 'warning', { ip });
      return c.json({
        error: 'Too many signup attempts. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
      }, 429);
    }

    // Validate request
    const body = await c.req.json();
    const validated = signupSchema.parse(body);

    // Validate password
    const passwordValidation = validatePassword(validated.password);
    if (!passwordValidation.valid) {
      return c.json({
        error: 'Password validation failed',
        details: passwordValidation.errors,
      }, 400);
    }

    const supabase = createClient();
    const adminSupabase = createAdminClient();

    // Check if email already exists (generic error to prevent enumeration)
    const { data: existingUser } = await adminSupabase.auth.admin.getUserByEmail(validated.email);
    if (existingUser?.user) {
      // Generic error - don't reveal if user exists
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200)); // Random delay
      await logSecurityEvent('signup_duplicate_email', 'info', { 
        ip,
        userAgent: c.req.header('user-agent'),
        email: validated.email,
      });
      return c.json({
        error: 'Unable to create account. Please check your information and try again.',
      }, 400);
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true, // Auto-confirm for MVP
      user_metadata: {
        name: validated.userName || validated.email.split('@')[0],
      },
    });

    if (authError || !authData.user) {
      await logSecurityEvent('signup_auth_error', 'warning', { 
        ip,
        error: authError?.message,
      });
      return c.json({
        error: 'Unable to create account. Please try again.',
      }, 500);
    }

    const userId = authData.user.id;

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: validated.organizationName,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      // Rollback: delete auth user
      await adminSupabase.auth.admin.deleteUser(userId);
      return c.json({
        error: 'Failed to create organization',
      }, 500);
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        tenant_id: tenant.id,
        role: 'owner',
        name: validated.userName || validated.email.split('@')[0],
      });

    if (profileError) {
      // Rollback
      await supabase.from('tenants').delete().eq('id', tenant.id);
      await adminSupabase.auth.admin.deleteUser(userId);
      return c.json({
        error: 'Failed to create user profile',
      }, 500);
    }

    // Create tenant settings
    await supabase.from('tenant_settings').insert({
      tenant_id: tenant.id,
    });

    // Generate API keys
    const testKey = generateApiKey('test');
    const liveKey = generateApiKey('live');

    const { error: keysError } = await supabase.from('api_keys').insert([
      {
        tenant_id: tenant.id,
        created_by_user_id: userId,
        name: 'Default Test Key',
        environment: 'test',
        key_prefix: getKeyPrefix(testKey),
        key_hash: hashApiKey(testKey),
      },
      {
        tenant_id: tenant.id,
        created_by_user_id: userId,
        name: 'Default Live Key',
        environment: 'live',
        key_prefix: getKeyPrefix(liveKey),
        key_hash: hashApiKey(liveKey),
      },
    ]);

    if (keysError) {
      // Keys are optional, log but don't fail
      console.error('Failed to create API keys:', keysError);
    }

    // Create session
    const { data: sessionData, error: sessionError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: validated.email,
    });

    // Log security event
    await logSecurityEvent('signup_success', 'info', {
      userId,
      tenantId: tenant.id,
      ip,
      userAgent: c.req.header('user-agent'),
    });

    // Return response (keys shown only once)
    return c.json({
      user: {
        id: userId,
        email: validated.email,
        name: validated.userName || validated.email.split('@')[0],
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      apiKeys: {
        test: {
          key: testKey, // Shown only once
          prefix: getKeyPrefix(testKey),
        },
        live: {
          key: liveKey, // Shown only once
          prefix: getKeyPrefix(liveKey),
        },
      },
      session: {
        accessToken: sessionData?.properties?.access_token,
        refreshToken: sessionData?.properties?.refresh_token,
      },
      warning: 'API keys are shown only once. Please save them securely.',
    }, 201);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
      }, 400);
    }
    throw error;
  }
});
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 201 | Success (see above) |
| 400 | `{ error: "Password validation failed", details: [...] }` |
| 400 | `{ error: "Unable to create account. Please check your information and try again." }` |
| 429 | `{ error: "Too many signup attempts...", retryAfter: 3600 }` |
| 500 | `{ error: "Unable to create account. Please try again." }` |

**Test Cases:**

```typescript
// Test 1: Successful signup
POST /v1/auth/signup
{
  "email": "test@example.com",
  "password": "SecureP@ss123456",
  "organizationName": "Test Org",
  "userName": "Test User"
}
// Expected: 201, returns user, tenant, API keys

// Test 2: Password too short
POST /v1/auth/signup
{
  "email": "test@example.com",
  "password": "short",
  "organizationName": "Test Org"
}
// Expected: 400, validation error

// Test 3: Duplicate email
POST /v1/auth/signup
{
  "email": "existing@example.com", // Already exists
  "password": "SecureP@ss123456",
  "organizationName": "Test Org"
}
// Expected: 400, generic error (no enumeration)

// Test 4: Rate limit exceeded
// Send 11 requests from same IP within 1 hour
// Expected: 429 on 11th request
```

#### Acceptance Criteria
- [ ] User can signup with email/password
- [ ] Tenant and user_profile created atomically
- [ ] Test and live API keys generated (256-bit entropy)
- [ ] Keys shown only once in response
- [ ] Keys never logged (only prefix)
- [ ] Email confirmation sent
- [ ] Password validated: min 12 chars, complexity rules
- [ ] Password checked against common password list
- [ ] Generic error if email already exists (no enumeration)
- [ ] Rate limited: 10 signups/hour per IP
- [ ] Security event logged: signup_success
- [ ] All test cases pass

---

### Story 11.3: User Login & Session Management

**Priority:** P0  
**Estimate:** 2 hours

#### Description
Implement login flow using Supabase Auth, returning tenant context for the dashboard.

#### API Endpoints

```
POST /v1/auth/login
```

**Request:**
```json
{
  "email": "admin@acme.com",
  "password": "SecureP@ss123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@acme.com",
    "name": "John Doe",
    "role": "owner"
  },
  "tenant": {
    "id": "uuid",
    "name": "Acme Fintech",
    "status": "active"
  },
  "session": {
    "accessToken": "jwt...",
    "refreshToken": "jwt...",
    "expiresAt": "2025-12-15T..."
  }
}
```

```
POST /v1/auth/logout
POST /v1/auth/refresh
POST /v1/auth/forgot-password
POST /v1/auth/reset-password
GET  /v1/auth/me
```

#### Acceptance Criteria
- [ ] Login returns JWT + tenant context
- [ ] Logout invalidates session (revokes refresh token)
- [ ] Token refresh works with rotation (old token invalidated)
- [ ] Password reset flow works
- [ ] `/me` endpoint returns current user + tenant
- [ ] Rate limited: 5 attempts/15min per account
- [ ] Account locked after 5 failures (15 min lockout)
- [ ] Email alert sent on account lockout
- [ ] Generic error message for all failures (no enumeration)
- [ ] Random delay (100-300ms) on auth failures
- [ ] Constant-time password comparison
- [ ] Access token expires in 15 minutes
- [ ] Refresh token expires in 7 days
- [ ] JWT algorithm explicitly RS256 (reject "none")
- [ ] Security events logged: login_success, login_failure, account_locked

---

### Story 11.4: Team Invite System

**Priority:** P1  
**Estimate:** 3 hours

#### Description
Allow admins/owners to invite team members to their organization.

#### API Endpoints

```
POST /v1/team/invite
```

**Request:**
```json
{
  "email": "teammate@acme.com",
  "role": "member",
  "name": "Jane Smith"
}
```

**Response:**
```json
{
  "invite": {
    "id": "uuid",
    "email": "teammate@acme.com",
    "role": "member",
    "expiresAt": "2025-12-21T...",
    "inviteUrl": "https://app.payos.dev/invite/abc123..."
  }
}
```

```
GET  /v1/team                    -- List team members
GET  /v1/team/invites            -- List pending invites
POST /v1/team/invites/:id/resend -- Resend invite email
DELETE /v1/team/invites/:id      -- Cancel invite
POST /v1/auth/accept-invite      -- Accept invite (creates user)
PATCH /v1/team/:userId           -- Update member role
DELETE /v1/team/:userId          -- Remove member
```

#### Invite Flow
1. Admin creates invite with email + role
2. System generates secure invite token
3. Email sent with invite link
4. Invitee clicks link → redirected to signup form (password only)
5. On submit: auth.users created, user_profiles created, invite marked accepted
6. New user can now login and see tenant data

#### Role Permissions

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| View data | ✅ | ✅ | ✅ | ✅ |
| Create transfers | ✅ | ✅ | ✅ | ❌ |
| Manage disputes | ✅ | ✅ | ✅ | ❌ |
| Create API keys | ✅ | ✅ | ✅ | ❌ |
| Revoke own keys | ✅ | ✅ | ✅ | ❌ |
| Revoke others' keys | ✅ | ✅ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Change roles | ✅ | ✅* | ❌ | ❌ |
| Remove members | ✅ | ✅* | ❌ | ❌ |
| Tenant settings | ✅ | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |
| Delete tenant | ✅ | ❌ | ❌ | ❌ |

*Admin cannot change/remove owner or other admins

#### Acceptance Criteria
- [ ] Admins can invite users by email
- [ ] Invite email sent with secure link
- [ ] Invite token is 256-bit cryptographic random
- [ ] Invite expires after 7 days
- [ ] Invite is single-use (deleted on accept)
- [ ] Invitee can accept and set password
- [ ] Password validated same as signup (12+ chars, etc.)
- [ ] Cannot invite with role higher than own role
- [ ] Role changes logged as security event
- [ ] Cannot remove last owner
- [ ] Cannot change role of owner (except transfer)
- [ ] Security events logged: user_invited, invite_accepted, role_changed, user_removed

---

### Story 11.5: API Key Management

**Priority:** P0  
**Estimate:** 3 hours

#### Description
Implement endpoints for creating, listing, and revoking API keys.

#### API Endpoints

```
POST /v1/api-keys
```

**Request:**
```json
{
  "name": "Production Backend",
  "environment": "live",
  "description": "Main production API key",
  "expiresAt": "2026-12-14T00:00:00Z"  // Optional
}
```

**Response:**
```json
{
  "apiKey": {
    "id": "uuid",
    "name": "Production Backend",
    "environment": "live",
    "prefix": "pk_live_abc1",
    "key": "pk_live_abc123xyz789...",  // Shown ONCE
    "createdAt": "2025-12-14T...",
    "expiresAt": "2026-12-14T..."
  },
  "warning": "This key will only be shown once. Please save it securely."
}
```

```
GET    /v1/api-keys              -- List all keys (no secrets shown)
GET    /v1/api-keys/:id          -- Get key details
DELETE /v1/api-keys/:id          -- Revoke key
POST   /v1/api-keys/:id/rotate   -- Rotate key (creates new, schedules old for revocation)
```

#### Key Generation
- Format: `pk_{env}_{random32chars}`
- Example: `pk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- Store: prefix (first 12 chars) + SHA-256 hash

#### Acceptance Criteria
- [ ] Users can create test and live keys
- [ ] Keys generated with 256-bit entropy
- [ ] Keys stored as SHA-256 hash (never plaintext)
- [ ] Key shown only once on creation
- [ ] Key never logged anywhere (only prefix)
- [ ] List endpoint never shows full key (only prefix)
- [ ] Revoke immediately invalidates key
- [ ] Rotate creates new key with grace period (24h default)
- [ ] Optional expiration supported
- [ ] Rate limited: 10 key creations per day
- [ ] Only admins/owners can revoke others' keys
- [ ] Members can only revoke their own keys
- [ ] Security events logged: api_key_created, api_key_revoked, api_key_rotated

---

### Story 11.6: Updated Auth Middleware

**Priority:** P0  
**Estimate:** 2 hours

#### Description
Update the auth middleware to support both API key auth (from api_keys table) and JWT auth (from Supabase sessions).

#### Auth Flow

```
Request comes in
     │
     ▼
┌─────────────────────────────────────┐
│ Check Authorization header          │
└─────────────────────────────────────┘
     │
     ├─── Bearer pk_* ──────► API Key Auth
     │                              │
     │                              ▼
     │                        api_keys table
     │                        (prefix lookup + hash verify)
     │                              │
     │                              ▼
     │                        Set ctx: tenantId, actorType='api_key'
     │
     ├─── Bearer jwt ───────► Supabase Auth
     │                              │
     │                              ▼
     │                        Verify JWT
     │                              │
     │                              ▼
     │                        user_profiles table
     │                        (get tenant + role)
     │                              │
     │                              ▼
     │                        Set ctx: tenantId, actorType='user', role
     │
     └─── Bearer agent_* ───► Agent Auth (existing)
```

#### Request Context Update

```typescript
interface RequestContext {
  tenantId: string;
  actorType: 'user' | 'agent' | 'api_key';
  actorId: string;
  actorName: string;
  // New fields for user auth
  userRole?: 'owner' | 'admin' | 'member' | 'viewer';
  apiKeyId?: string;
  apiKeyEnvironment?: 'test' | 'live';
  // Existing
  kyaTier?: number;
}
```

#### Acceptance Criteria
- [ ] API key auth works via api_keys table
- [ ] JWT auth works via Supabase + user_profiles
- [ ] Agent auth continues to work
- [ ] Backwards compatible with existing pk_* keys during migration
- [ ] Context includes user role for dashboard authorization
- [ ] Constant-time hash comparison for all secrets
- [ ] API key last_used_at updated on each request
- [ ] API key last_used_ip tracked
- [ ] Expired keys rejected with clear error
- [ ] Revoked keys rejected with clear error
- [ ] Full key never logged (only prefix)
- [ ] Security event logged on new IP for key

---

### Story 11.7: Dashboard Auth UI

**Priority:** P1  
**Estimate:** 4 hours

#### Description
Implement login, signup, and password reset pages in the dashboard.

#### Pages

1. **Login Page** (`/login`)
   - Email + password form
   - "Forgot password?" link
   - "Create account" link
   - Error handling (invalid credentials, account locked)

2. **Signup Page** (`/signup`)
   - Email, password, confirm password
   - Organization name
   - Your name
   - Terms acceptance checkbox
   - Show API keys after signup (copy to clipboard)

3. **Forgot Password** (`/forgot-password`)
   - Email input
   - Success message with instructions

4. **Reset Password** (`/reset-password`)
   - New password + confirm
   - Token validation

5. **Accept Invite** (`/invite/:token`)
   - Shows organization name
   - Set password form
   - Already shows email (from invite)

#### Protected Routes
- All dashboard routes require authentication
- Redirect to `/login` if not authenticated
- Store session in localStorage/cookies
- Auto-refresh token before expiry

#### Acceptance Criteria
- [ ] Login form with validation
- [ ] Signup form creates tenant + shows API keys
- [ ] API keys displayed with copy button and warning
- [ ] Password reset flow works
- [ ] Invite acceptance flow works
- [ ] Session persists across page refresh (secure storage)
- [ ] Tokens stored in HttpOnly cookies (not localStorage for JWTs)
- [ ] Protected routes redirect to login
- [ ] Logout clears session and revokes refresh token
- [ ] Show lockout message when account locked
- [ ] Password strength indicator on forms
- [ ] CSRF protection on all forms

---

### Story 11.8: Settings - Team Management UI

**Priority:** P1  
**Estimate:** 3 hours

#### Description
Add team management section to settings page.

#### UI Components

1. **Team Members List**
   - Name, email, role, joined date
   - Edit role dropdown (if permitted)
   - Remove button (if permitted)
   - "You" badge for current user

2. **Pending Invites**
   - Email, role, invited by, expires
   - Resend button
   - Cancel button

3. **Invite Modal**
   - Email input
   - Role selector
   - Optional name
   - Send button

#### Acceptance Criteria
- [ ] List all team members with roles
- [ ] Invite new members
- [ ] Change member roles (with permission)
- [ ] Remove members (with permission)
- [ ] Cannot remove self or last owner
- [ ] Pending invites shown separately

---

### Story 11.9: Settings - API Keys Management UI

**Priority:** P1  
**Estimate:** 3 hours

#### Description
Add API keys management section to settings page.

#### UI Components

1. **API Keys List**
   - Tabs: Test / Live
   - For each key: name, prefix, created date, last used, status
   - Copy prefix button
   - Revoke button
   - Created by user shown

2. **Create Key Modal**
   - Name input
   - Environment toggle (test/live)
   - Optional description
   - Optional expiration date picker
   - Create button

3. **Key Created Modal** (shown after creation)
   - Full key displayed
   - Copy button
   - Warning: "This key will only be shown once"
   - "I've saved this key" button to dismiss

4. **Revoke Confirmation Modal**
   - Warning about immediate effect
   - Reason input (optional)
   - Confirm button

#### Acceptance Criteria
- [ ] List keys by environment
- [ ] Create new keys with confirmation
- [ ] Show key only once after creation
- [ ] Revoke with confirmation
- [ ] Show last used timestamp
- [ ] Show created by user

---

### Story 11.10: Migration - Existing API Keys

**Priority:** P0  
**Estimate:** 1 hour

#### Description
Migrate existing tenant.api_key values to the new api_keys table for backwards compatibility.

#### Migration Script

```sql
-- Migrate existing tenant API keys to api_keys table
INSERT INTO api_keys (
  tenant_id,
  name,
  environment,
  key_prefix,
  key_hash,
  status,
  created_at
)
SELECT 
  id AS tenant_id,
  'Legacy API Key' AS name,
  CASE 
    WHEN api_key LIKE 'pk_test_%' THEN 'test'
    WHEN api_key LIKE 'pk_live_%' THEN 'live'
    ELSE 'test'
  END AS environment,
  api_key_prefix AS key_prefix,
  api_key_hash AS key_hash,
  'active' AS status,
  created_at
FROM tenants
WHERE api_key_hash IS NOT NULL;
```

#### Acceptance Criteria
- [ ] All existing tenant keys migrated
- [ ] Auth middleware checks api_keys table first
- [ ] Falls back to tenant.api_key for unmigrated keys
- [ ] No downtime during migration

---

### Story 11.11: Security Infrastructure

**Priority:** P0  
**Estimate:** 4 hours

#### Description
Implement core security controls to protect against common authentication attacks. This is a P0 blocker - must be implemented before any auth endpoints go live.

#### Database Schema

**Migration File:** `supabase/migrations/YYYYMMDDHHMMSS_create_security_events.sql`

```sql
-- Security events table for audit logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON public.security_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;

-- RLS: Users can only see events for their tenant
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_events_tenant ON public.security_events
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
```

#### Components

##### 1. Rate Limiting

**File:** `apps/api/src/utils/rate-limiter.ts`

```typescript
import { createClient } from '../db/client.js';

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

// In-memory store for MVP (replace with Redis for production)
const rateLimitStore = new Map<string, { count: number; resetAt: Date }>();

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const record = rateLimitStore.get(key);
  
  // Clean expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  if (!record || now > record.resetAt) {
    // New window or expired
    const resetAt = new Date(now.getTime() + config.windowMs);
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt,
    };
  }
  
  if (record.count >= config.maxAttempts) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfter,
    };
  }
  
  // Increment counter
  record.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - record.count,
    resetAt: record.resetAt,
  };
}

// Predefined rate limiters
export const RATE_LIMITERS = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
  },
  signup: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 10,
  },
  ip: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 100,
  },
  apiKeyCreation: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxAttempts: 10,
  },
} as const;
```

**Usage in routes:**
```typescript
import { checkRateLimit, RATE_LIMITERS } from '../utils/rate-limiter.js';

// In login route
const ip = c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown';
const email = body.email;

// Check per-account rate limit
const accountLimit = await checkRateLimit(
  `login:${email}`,
  RATE_LIMITERS.login
);

if (!accountLimit.allowed) {
  return c.json({
    error: 'Too many login attempts. Please try again later.',
    retryAfter: accountLimit.retryAfter,
  }, 429);
}

// Check per-IP rate limit
const ipLimit = await checkRateLimit(
  `login:ip:${ip}`,
  RATE_LIMITERS.ip
);

if (!ipLimit.allowed) {
  return c.json({
    error: 'Too many requests from this IP. Please try again later.',
    retryAfter: ipLimit.retryAfter,
  }, 429);
}
```

##### 2. Account Lockout

```sql
-- Add to user_profiles
ALTER TABLE user_profiles ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN locked_until TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN last_failed_login_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN last_failed_login_ip TEXT;
```

##### 3. Security Event Logging

```sql
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,  -- login_success, login_failure, account_locked, etc.
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_events_tenant ON security_events(tenant_id, created_at DESC);
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_severity ON security_events(severity, created_at DESC);
```

##### 4. Constant-Time Comparisons

```typescript
import { timingSafeEqual, createHash } from 'crypto';

export function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    // Compare against self to maintain constant time
    timingSafeEqual(bufA, bufA);
    return false;
  }
  
  return timingSafeEqual(bufA, bufB);
}

export function verifyApiKeySecure(plainKey: string, storedHash: string): boolean {
  const inputHash = createHash('sha256').update(plainKey).digest('hex');
  return secureCompare(inputHash, storedHash);
}
```

##### 5. Generic Error Responses

```typescript
// WRONG - reveals user existence
if (!user) return { error: 'User not found' };
if (!validPassword) return { error: 'Invalid password' };

// RIGHT - same message for all auth failures
const AUTH_FAILURE_MESSAGE = 'Invalid credentials';
const RATE_LIMIT_MESSAGE = 'Too many attempts. Please try again later.';

// Add random delay to prevent timing attacks
async function authFailureResponse() {
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
  return { error: AUTH_FAILURE_MESSAGE };
}
```

##### 6. Password Requirements

```typescript
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,  // Controversial - length > complexity
  maxLength: 128,
  commonPasswordCheck: true, // Check against top 10k passwords
};

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  // ... other checks
  
  return { valid: errors.length === 0, errors };
}
```

##### 7. Secure Token Generation

```typescript
import { randomBytes } from 'crypto';

// API Keys: 256 bits of entropy
export function generateApiKey(environment: 'test' | 'live'): string {
  const random = randomBytes(32).toString('base64url');
  return `pk_${environment}_${random}`;
}

// Invite tokens: 256 bits
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

// Refresh tokens: 256 bits
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}
```

##### 8. Request Logging (Secrets Redacted)

```typescript
function redactSensitiveData(data: any): any {
  const sensitiveKeys = ['password', 'apiKey', 'key', 'token', 'secret', 'authorization'];
  
  if (typeof data === 'string') {
    // Redact API keys in strings
    return data.replace(/pk_(test|live)_[a-zA-Z0-9_-]+/g, 'pk_$1_[REDACTED]');
  }
  
  if (typeof data === 'object' && data !== null) {
    const redacted = { ...data };
    for (const key of Object.keys(redacted)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(redacted[key]);
      }
    }
    return redacted;
  }
  
  return data;
}
```

#### Acceptance Criteria
- [ ] Rate limiting on login (5 attempts/15 min per account)
- [ ] Rate limiting on signup (10/hour per IP)
- [ ] Rate limiting on API key creation (10/day per tenant)
- [ ] Account lockout after 5 failed attempts (15 min)
- [ ] Email alert sent on account lockout
- [ ] Security events logged to security_events table
- [ ] Constant-time comparison for all secrets
- [ ] Generic error messages (no user enumeration)
- [ ] Random delay on auth failures (100-300ms)
- [ ] Password minimum 12 characters
- [ ] Check passwords against common password list
- [ ] 256-bit entropy for all tokens
- [ ] Sensitive data redacted from all logs
- [ ] API key prefix shown in logs, never full key

---

### Story 11.12: Session Security

**Priority:** P0  
**Estimate:** 2 hours

#### Description
Implement secure session management with refresh token rotation and anomaly detection.

#### Components

##### 1. Refresh Token Rotation

```typescript
async function refreshSession(refreshToken: string, clientInfo: ClientInfo) {
  const session = await validateRefreshToken(refreshToken);
  if (!session) {
    await logSecurityEvent('invalid_refresh_token', { token: refreshToken.slice(0, 8) });
    throw new AuthError('Invalid refresh token');
  }
  
  // Detect token reuse (potential theft)
  if (session.used) {
    // Token was already used - possible theft!
    await revokeAllUserSessions(session.userId);
    await logSecurityEvent('refresh_token_reuse', { 
      userId: session.userId,
      severity: 'critical'
    });
    await sendSecurityAlert(session.userId, 'All sessions revoked due to suspicious activity');
    throw new AuthError('Session invalidated');
  }
  
  // Mark token as used
  await markRefreshTokenUsed(refreshToken);
  
  // Issue new tokens
  const newAccessToken = generateAccessToken(session.userId, { expiresIn: '15m' });
  const newRefreshToken = await createRefreshToken(session.userId, clientInfo);
  
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

##### 2. Session Storage

```sql
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_used BOOLEAN DEFAULT false,  -- For rotation detection
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash) WHERE revoked_at IS NULL;
```

##### 3. JWT Configuration

```typescript
const JWT_CONFIG = {
  accessToken: {
    expiresIn: '15m',           // Short-lived
    algorithm: 'RS256',          // Asymmetric - can verify without secret
  },
  refreshToken: {
    expiresIn: '7d',            // Longer-lived, but rotated
    algorithm: 'HS256',          // Symmetric - only server can create
  },
};

// CRITICAL: Explicitly set algorithm to prevent "none" attack
function verifyAccessToken(token: string) {
  return jwt.verify(token, PUBLIC_KEY, { 
    algorithms: ['RS256'],      // ONLY accept RS256
    issuer: 'payos',
    audience: 'payos-dashboard',
  });
}
```

##### 4. Anomaly Detection

```typescript
interface SessionAnomaly {
  type: 'new_ip' | 'new_device' | 'impossible_travel' | 'unusual_time';
  severity: 'low' | 'medium' | 'high';
  action: 'log' | 'step_up' | 'block';
}

async function detectAnomalies(userId: string, clientInfo: ClientInfo): Promise<SessionAnomaly[]> {
  const anomalies: SessionAnomaly[] = [];
  const recentSessions = await getRecentSessions(userId, 30); // Last 30 days
  
  // New IP address
  const knownIps = new Set(recentSessions.map(s => s.ip_address));
  if (!knownIps.has(clientInfo.ip)) {
    anomalies.push({ type: 'new_ip', severity: 'low', action: 'log' });
  }
  
  // Impossible travel (login from far location within short time)
  const lastSession = recentSessions[0];
  if (lastSession && isImpossibleTravel(lastSession, clientInfo)) {
    anomalies.push({ type: 'impossible_travel', severity: 'high', action: 'block' });
  }
  
  return anomalies;
}
```

#### Acceptance Criteria
- [ ] Access tokens expire in 15 minutes
- [ ] Refresh tokens expire in 7 days
- [ ] Refresh tokens rotated on each use
- [ ] Token reuse triggers session revocation + alert
- [ ] Sessions stored in database with metadata
- [ ] JWT algorithm explicitly set (no "none" attack)
- [ ] New IP/device logged as security event
- [ ] User can view active sessions
- [ ] User can revoke individual sessions
- [ ] "Logout all devices" functionality

---

### Epic 11 Summary

| Story | Priority | Est (hrs) | API | UI |
|-------|----------|-----------|-----|-----|
| 11.1 User Profiles & API Keys Tables | P0 | 2 | ✅ | |
| 11.2 Self-Service Signup Flow | P0 | 3 | ✅ | |
| 11.3 User Login & Session Management | P0 | 2 | ✅ | |
| 11.4 Team Invite System | P1 | 3 | ✅ | |
| 11.5 API Key Management | P0 | 3 | ✅ | |
| 11.6 Updated Auth Middleware | P0 | 2 | ✅ | |
| 11.7 Dashboard Auth UI | P1 | 4 | | ✅ |
| 11.8 Settings - Team Management UI | P1 | 3 | | ✅ |
| 11.9 Settings - API Keys Management UI | P1 | 3 | | ✅ |
| 11.10 Migration - Existing API Keys | P0 | 1 | ✅ | |
| 11.11 Security Infrastructure | P0 | 4 | ✅ | |
| 11.12 Session Security | P0 | 2 | ✅ | |
| **Total** | | **32** | | |

---

### Security Requirements Matrix

All authentication-related stories MUST implement these controls:

#### Authentication Security

| Requirement | Stories | Priority |
|-------------|---------|----------|
| Rate limit login attempts (5/15min per account) | 11.3, 11.11 | P0 |
| Rate limit by IP (100/15min) | 11.2, 11.3, 11.11 | P0 |
| Account lockout after 5 failures | 11.3, 11.11 | P0 |
| Email alert on account lockout | 11.3, 11.11 | P0 |
| Generic error messages (no enumeration) | 11.2, 11.3, 11.4 | P0 |
| Constant-time secret comparison | 11.3, 11.5, 11.6 | P0 |
| Random delay on auth failures (100-300ms) | 11.3, 11.11 | P0 |
| Password min 12 chars with complexity | 11.2, 11.3 | P0 |
| Check against common passwords | 11.2, 11.3 | P1 |

#### API Key Security

| Requirement | Stories | Priority |
|-------------|---------|----------|
| 256-bit random key generation | 11.2, 11.5 | P0 |
| SHA-256 hash storage (never plaintext) | 11.1, 11.5 | P0 |
| Constant-time hash verification | 11.6, 11.11 | P0 |
| Never log full keys (prefix only) | 11.5, 11.6, 11.11 | P0 |
| Track last_used_at and last_used_ip | 11.1, 11.6 | P1 |
| Rate limit key creation (10/day) | 11.5, 11.11 | P1 |
| Key shown only once on creation | 11.2, 11.5, 11.9 | P0 |

#### Session Security

| Requirement | Stories | Priority |
|-------------|---------|----------|
| Short access token expiry (15 min) | 11.3, 11.12 | P0 |
| Refresh token rotation on use | 11.3, 11.12 | P0 |
| Token reuse detection + session revocation | 11.12 | P0 |
| Explicit JWT algorithm (reject "none") | 11.3, 11.6, 11.12 | P0 |
| Secure HttpOnly cookies for web | 11.7 | P0 |
| Session stored with device/IP metadata | 11.12 | P1 |

#### Invite Security

| Requirement | Stories | Priority |
|-------------|---------|----------|
| 256-bit cryptographic tokens | 11.4, 11.11 | P0 |
| 7-day expiration | 11.4 | P0 |
| Single-use tokens | 11.4 | P0 |
| Cannot invite as higher role than self | 11.4 | P0 |
| Email verification before dashboard access | 11.2, 11.4 | P1 |

#### Authorization Security

| Requirement | Stories | Priority |
|-------------|---------|----------|
| Tenant isolation via RLS | 11.1 | P0 |
| Role checks server-side only | 11.4, 11.6 | P0 |
| Block removal of last owner | 11.4, 11.8 | P0 |
| Audit log all role changes | 11.4 | P0 |
| Audit log all key operations | 11.5 | P0 |

#### Monitoring & Alerting

| Requirement | Stories | Priority |
|-------------|---------|----------|
| Log all auth failures | 11.11 | P0 |
| Log all security events to dedicated table | 11.11 | P0 |
| Alert on account lockout | 11.11 | P0 |
| Alert on token reuse | 11.12 | P0 |
| Alert on impossible travel | 11.12 | P2 |
| Redact secrets from all logs | 11.11 | P0 |

---

### Security Event Types

```typescript
type SecurityEventType = 
  // Authentication
  | 'login_success'
  | 'login_failure'
  | 'login_rate_limited'
  | 'account_locked'
  | 'account_unlocked'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  
  // Sessions
  | 'session_created'
  | 'session_refreshed'
  | 'session_revoked'
  | 'refresh_token_reuse'        // CRITICAL
  | 'all_sessions_revoked'
  
  // API Keys
  | 'api_key_created'
  | 'api_key_revoked'
  | 'api_key_rotated'
  | 'api_key_used_from_new_ip'
  
  // Team
  | 'user_invited'
  | 'user_invite_accepted'
  | 'user_role_changed'
  | 'user_removed'
  | 'ownership_transferred'
  
  // Anomalies
  | 'new_ip_detected'
  | 'new_device_detected'
  | 'impossible_travel'
  | 'unusual_activity';

type SecurityEventSeverity = 'info' | 'warning' | 'critical';
```

---

### Epic 11 Implementation Checklist

This checklist ensures all files, dependencies, and configurations are in place before implementation begins.

#### Files to Create

**Database Migrations:**
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_create_user_profiles_and_api_keys.sql` (Story 11.1)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_create_security_events.sql` (Story 11.11)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_create_user_sessions.sql` (Story 11.12)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_migrate_existing_api_keys.sql` (Story 11.10)

**API Routes:**
- [ ] `apps/api/src/routes/auth.ts` (Stories 11.2, 11.3)
- [ ] `apps/api/src/routes/team.ts` (Story 11.4)
- [ ] `apps/api/src/routes/api-keys.ts` (Story 11.5)

**Utilities:**
- [ ] `apps/api/src/utils/auth.ts` (password validation, key generation, rate limiting)
- [ ] `apps/api/src/utils/crypto.ts` (update with secure comparison functions)
- [ ] `apps/api/src/utils/rate-limiter.ts` (rate limiting implementation)

**Middleware:**
- [ ] `apps/api/src/middleware/auth.ts` (update for JWT + API keys, Story 11.6)
- [ ] `apps/api/src/middleware/rate-limit.ts` (rate limiting middleware)

**Services:**
- [ ] `apps/api/src/services/sessions.ts` (session management, Story 11.12)
- [ ] `apps/api/src/services/security.ts` (security event logging, Story 11.11)

**Database Admin Client:**
- [ ] `apps/api/src/db/admin-client.ts` (Supabase admin client for auth operations)

**Tests:**
- [ ] `apps/api/tests/unit/auth.test.ts`
- [ ] `apps/api/tests/unit/team.test.ts`
- [ ] `apps/api/tests/unit/api-keys.test.ts`
- [ ] `apps/api/tests/integration/auth.test.ts`
- [ ] `apps/api/tests/integration/security.test.ts`

**UI Components:**
- [ ] `payos-ui/src/pages/LoginPage.tsx` (Story 11.7)
- [ ] `payos-ui/src/pages/SignupPage.tsx` (Story 11.7)
- [ ] `payos-ui/src/pages/ForgotPasswordPage.tsx` (Story 11.7)
- [ ] `payos-ui/src/pages/ResetPasswordPage.tsx` (Story 11.7)
- [ ] `payos-ui/src/pages/AcceptInvitePage.tsx` (Story 11.7)
- [ ] `payos-ui/src/components/settings/TeamManagement.tsx` (Story 11.8)
- [ ] `payos-ui/src/components/settings/ApiKeysManagement.tsx` (Story 11.9)
- [ ] `payos-ui/src/hooks/useAuth.ts` (auth context/hook)
- [ ] `payos-ui/src/utils/api-client.ts` (update with JWT handling)

#### Files to Modify

**API:**
- [ ] `apps/api/src/app.ts` (register new routes)
- [ ] `apps/api/src/middleware/auth.ts` (add JWT support, Story 11.6)
- [ ] `apps/api/src/middleware/error.ts` (add new error types if needed)
- [ ] `apps/api/src/utils/helpers.ts` (add auth helper functions)

**UI:**
- [ ] `payos-ui/src/App.tsx` (add auth routes, protected route wrapper)
- [ ] `payos-ui/src/components/layout/TopBar.tsx` (add user menu, logout)
- [ ] `payos-ui/src/pages/SettingsPage.tsx` (add team and API keys tabs)

#### Environment Variables Required

**API (.env):**
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For admin operations
SUPABASE_ANON_KEY=your_anon_key

# JWT
JWT_SECRET=your_jwt_secret  # For signing JWTs
JWT_PUBLIC_KEY=your_public_key  # For verifying JWTs (if using RS256)

# Rate Limiting (optional - uses in-memory by default)
REDIS_URL=redis://localhost:6379  # For production rate limiting

# Email (for invites and notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@payos.dev

# App URLs
APP_URL=https://app.payos.dev
API_URL=https://api.payos.dev
```

**UI (.env):**
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://api.payos.dev
```

#### Dependencies to Install

**API:**
```bash
cd apps/api
npm install jsonwebtoken @types/jsonwebtoken
npm install ioredis  # For production rate limiting (optional)
npm install nodemailer @types/nodemailer  # For email sending
npm install @supabase/supabase-js  # Already installed, verify version
```

**UI:**
```bash
cd payos-ui
npm install @supabase/supabase-js  # For Supabase Auth client
```

#### Database Setup

1. **Run migrations in order:**
   ```bash
   supabase migration up
   ```

2. **Verify tables created:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_profiles', 'api_keys', 'security_events', 'user_sessions');
   ```

3. **Verify RLS policies:**
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('user_profiles', 'api_keys');
   ```

#### Testing Checklist

**Unit Tests:**
- [ ] Password validation (all rules)
- [ ] API key generation (format, entropy)
- [ ] Hash comparison (constant-time)
- [ ] Rate limiting logic
- [ ] Token generation

**Integration Tests:**
- [ ] Signup flow (success, validation errors, rate limit)
- [ ] Login flow (success, wrong password, account locked)
- [ ] API key creation and usage
- [ ] Team invite and acceptance
- [ ] Session refresh and rotation
- [ ] Security event logging

**Manual Testing:**
- [ ] Signup creates tenant + user + keys
- [ ] Login returns JWT + tenant context
- [ ] API keys work for API requests
- [ ] Rate limiting blocks after threshold
- [ ] Account locks after 5 failures
- [ ] Invite flow works end-to-end
- [ ] Security events logged correctly

#### Security Verification

- [ ] No secrets logged (only prefixes)
- [ ] Constant-time comparison for all secrets
- [ ] Generic error messages (no enumeration)
- [ ] Rate limiting active on all auth endpoints
- [ ] RLS policies prevent cross-tenant access
- [ ] JWT algorithm explicitly set (no "none")
- [ ] Refresh tokens rotated on use
- [ ] Password requirements enforced
- [ ] API keys never returned after creation

#### Documentation Updates

- [ ] API documentation updated with new endpoints
- [ ] README updated with setup instructions
- [ ] Environment variable documentation
- [ ] Security best practices guide
- [ ] Deployment checklist

---

### Future TODOs (Out of Scope)

- [ ] **Granular API Key Scopes** - Allow keys with limited permissions (e.g., read-only)
- [ ] **Multi-Tenant Users** - Allow one user to belong to multiple organizations
- [ ] **SSO/OAuth** - Google, GitHub, SAML integration via Supabase
- [ ] **2FA/MFA** - Two-factor authentication for dashboard users
- [ ] **API Key Rate Limiting** - Per-key rate limits
- [ ] **API Key IP Allowlist** - Restrict keys to specific IPs
- [ ] **Audit Log for User Actions** - Track all user dashboard actions

---

## Epic 12: Client-Side Caching & Data Management

### Overview

Implement intelligent client-side data caching using React Query (TanStack Query) to improve UI responsiveness and reduce unnecessary API calls. Currently, navigating between list views and detail pages re-fetches data every time, creating a sluggish user experience.

**Strategic Context:**
- **Client-Side:** React Query for UI caching and optimistic updates
- **Server-Side:** Redis for API response caching (future consideration)
- **Goal:** Sub-100ms perceived load times for cached data

### Business Value

- **User Experience:** Instant navigation between views, data feels "already there"
- **API Cost Reduction:** Fewer redundant API calls, lower infrastructure costs
- **Scalability:** Better handling of concurrent users with cached data
- **Developer Experience:** Standard patterns for data fetching, mutations, and cache invalidation

### Technical Approach

**Phase 2: React Query Migration** (Recommended)
- Replace custom `useApi` hooks with `useQuery` and `useMutation`
- Automatic background refetching and cache invalidation
- Optimistic UI updates for instant feedback
- Built-in retry logic and error handling

### Stories

#### Story 12.1: React Query Infrastructure Setup

**Description:** Install and configure React Query with QueryClientProvider, DevTools, and default options.

**Acceptance Criteria:**
- [ ] Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
- [ ] Wrap app with `QueryClientProvider` in `App.tsx`
- [ ] Configure default options:
  ```typescript
  staleTime: 5 * 60 * 1000,      // 5 minutes
  cacheTime: 30 * 60 * 1000,     // 30 minutes  
  refetchOnWindowFocus: true,     // Refresh when tab gains focus
  retry: 2,                        // Retry failed requests twice
  ```
- [ ] Add React Query DevTools in development mode
- [ ] Create `queryClient.ts` with typed query keys

**Technical Notes:**
```typescript
// queryClient.ts
export const queryKeys = {
  accounts: (filters?: AccountFilters) => ['accounts', filters] as const,
  account: (id: string) => ['account', id] as const,
  agents: (filters?: AgentFilters) => ['agents', filters] as const,
  // ... etc
};
```

---

#### Story 12.2: Migrate Account Hooks to React Query

**Description:** Convert `useAccounts` and `useAccount` hooks from custom `useApi` to React Query.

**Acceptance Criteria:**
- [ ] Replace `useAccounts` with `useQuery`:
  ```typescript
  export function useAccounts(filters: AccountFilters = {}) {
    return useQuery({
      queryKey: queryKeys.accounts(filters),
      queryFn: () => fetchAccounts(filters),
      staleTime: 5 * 60 * 1000,
    });
  }
  ```
- [ ] Replace `useAccount` with `useQuery`
- [ ] Update `AccountsPage` to use new hooks (change `data` to `data?.data`)
- [ ] Update `AccountDetailPage` to use new hooks
- [ ] Test navigation between list and detail views (should be instant)
- [ ] Verify cache invalidation on account mutations

**Event-Based Invalidation:**
```typescript
// After creating/updating an account
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts() });
  queryClient.invalidateQueries({ queryKey: queryKeys.account(id) });
}
```

---

#### Story 12.3: Migrate Agent Hooks to React Query

**Description:** Convert agent data fetching to use React Query with proper cache invalidation.

**Acceptance Criteria:**
- [ ] Migrate `useAgents` and `useAgent` hooks
- [ ] Update `AgentsPage` and `AgentDetailPage` components
- [ ] Implement cache invalidation after agent mutations
- [ ] Test type filter changes (should reuse cached data when possible)
- [ ] Verify X-402 status updates invalidate cache

---

#### Story 12.4: Migrate Transaction/Transfer Hooks

**Description:** Convert transfer and transaction hooks to React Query.

**Acceptance Criteria:**
- [ ] Migrate `useTransfers` and `useTransfer` hooks
- [ ] Update `TransactionsPage` and `TransactionDetailPage`
- [ ] Implement shorter cache time for transactions (2 minutes - more real-time)
- [ ] Test rapid navigation between transactions
- [ ] Verify new transactions appear after creation

---

#### Story 12.5: Migrate Payment Methods & Cards

**Description:** Convert payment method hooks to React Query.

**Acceptance Criteria:**
- [ ] Migrate `usePaymentMethods` and `usePaymentMethod` hooks
- [ ] Update `CardsPage` and `CardDetailPage`
- [ ] Implement cache invalidation when adding/removing cards
- [ ] Test account detail page payment methods tab (should cache)

---

#### Story 12.6: Mutations & Optimistic Updates

**Description:** Implement React Query mutations for create/update/delete operations with optimistic UI updates.

**Acceptance Criteria:**
- [ ] Create mutation hooks for common operations:
  ```typescript
  export function useCreateAccount() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: createAccount,
      onMutate: async (newAccount) => {
        // Optimistic update
        await queryClient.cancelQueries({ queryKey: queryKeys.accounts() });
        const previousAccounts = queryClient.getQueryData(queryKeys.accounts());
        queryClient.setQueryData(queryKeys.accounts(), (old) => ({
          ...old,
          data: [...old.data, { ...newAccount, id: 'temp-id' }]
        }));
        return { previousAccounts };
      },
      onError: (err, newAccount, context) => {
        // Rollback on error
        queryClient.setQueryData(queryKeys.accounts(), context.previousAccounts);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts() });
      }
    });
  }
  ```
- [ ] Implement for: accounts, agents, transfers, payment methods
- [ ] Add loading states to mutation buttons
- [ ] Test optimistic updates (UI updates instantly, then confirms)
- [ ] Test rollback on API errors

---

#### Story 12.7: User-Triggered Refresh

**Description:** Add manual refresh capabilities for users who want the latest data.

**Acceptance Criteria:**
- [ ] Add "Refresh" button to list pages (accounts, agents, transactions)
- [ ] Implement pull-to-refresh on mobile (if applicable)
- [ ] Add keyboard shortcut (Cmd/Ctrl + R) for refresh
- [ ] Show subtle loading indicator during refresh
- [ ] Display "Last updated X seconds ago" timestamp
- [ ] Implement `refetch()` from React Query:
  ```typescript
  const { data, refetch } = useQuery(...);
  <button onClick={() => refetch()}>Refresh</button>
  ```

---

#### Story 12.8: Background Sync & Focus Refresh

**Description:** Configure automatic background data refresh based on user behavior.

**Acceptance Criteria:**
- [ ] Enable `refetchOnWindowFocus` for critical data:
  - Account balances (always fresh)
  - Transaction history (fresh on focus)
  - Agent status (fresh on focus)
- [ ] Disable for static data:
  - Account details (5 min stale time)
  - Agent details (10 min stale time)
- [ ] Add visual indicator when data is being refetched in background
- [ ] Test: Open dashboard, switch tabs, return → should refresh data
- [ ] Test: Leave dashboard overnight, return → should show fresh data

---

#### Story 12.9: Cache Invalidation Strategy

**Description:** Implement intelligent cache invalidation based on data relationships and events.

**Acceptance Criteria:**
- [ ] **Event-Based Invalidation Rules:**
  - Account created → invalidate `accounts` list
  - Account updated → invalidate `accounts` list + specific `account`
  - Transfer created → invalidate `transfers` list + related `account` balances
  - Agent created → invalidate `agents` list + parent `account`
  - Payment method added → invalidate `payment-methods` + `account`
- [ ] **Cascading Invalidation:**
  ```typescript
  // When account balance changes
  invalidateQueries(['account', accountId]);
  invalidateQueries(['accounts']); // List might show balances
  invalidateQueries(['transfers', { account_id: accountId }]);
  ```
- [ ] Document invalidation rules in `docs/caching-strategy.md`
- [ ] Add helper function `invalidateRelatedQueries(entity, id)`

---

#### Story 12.10: Cache Performance Monitoring

**Description:** Add monitoring and metrics for cache effectiveness.

**Acceptance Criteria:**
- [ ] Use React Query DevTools to inspect:
  - Cache hit/miss ratio
  - Query staleness
  - Background refetch frequency
- [ ] Add custom metrics (optional):
  - Track `cacheHitRate` metric
  - Track `averageResponseTime` (cached vs uncached)
- [ ] Document cache configuration in README
- [ ] Create troubleshooting guide for cache issues

---

### Cache TTL Strategy

| Data Type | Stale Time | Cache Time | Rationale |
|-----------|------------|------------|-----------|
| **Account List** | 5 min | 30 min | Changes infrequently, OK to be slightly stale |
| **Account Detail** | 10 min | 30 min | Static info, rarely changes |
| **Account Balance** | 30 sec | 5 min | More critical, needs to be fresh |
| **Transfers** | 2 min | 10 min | Important to show recent transactions |
| **Agents** | 5 min | 30 min | Moderate update frequency |
| **Payment Methods** | 10 min | 30 min | Rarely change after creation |
| **Stats/Analytics** | 1 min | 5 min | Aggregate data, OK with slight delay |

---

### Future Considerations

#### Server-Side Redis Caching
**Note:** Under evaluation for Phase 3+

**Potential Use Cases:**
- API response caching (reduce DB load)
- Rate limiting (distributed counters)
- Session storage (distributed sessions)
- Real-time analytics (materialized views)

**Trade-offs:**
- **Pros:** Reduces database load, faster API responses, distributed caching
- **Cons:** Added complexity, cache invalidation across servers, additional infrastructure cost
- **Decision:** Evaluate after monitoring actual database load in production

**Integration Points:**
```typescript
// Middleware for Redis caching (future)
app.use('/v1/accounts', cacheMiddleware({ ttl: 300 }));
```

---

### Testing Requirements

- [ ] Test cache persistence across navigation
- [ ] Test cache invalidation after mutations
- [ ] Test focus-based refresh
- [ ] Test user-triggered refresh
- [ ] Test optimistic updates and rollback
- [ ] Test performance: < 100ms for cached data
- [ ] Test with slow network (should show cached data first)
- [ ] Test DevTools show correct cache state

---

### Implementation Checklist

**Setup (Story 12.1)**
- [ ] Install React Query
- [ ] Configure QueryClientProvider
- [ ] Add DevTools
- [ ] Create query key factory

**Migration (Stories 12.2-12.5)**
- [ ] Migrate accounts hooks
- [ ] Migrate agents hooks
- [ ] Migrate transfers hooks
- [ ] Migrate payment methods hooks
- [ ] Update all consuming components

**Advanced Features (Stories 12.6-12.9)**
- [ ] Implement mutations
- [ ] Add optimistic updates
- [ ] Add user-triggered refresh
- [ ] Configure background sync
- [ ] Implement invalidation strategy

**Monitoring (Story 12.10)**
- [ ] Add performance monitoring
- [ ] Document cache strategy
- [ ] Create troubleshooting guide

---

## Implementation Schedule

### Phase 1: Full PoC with Mocks (Weekends 1-2)

**Goal:** Complete, demo-ready system using database-only approach.

#### Pre-Work: Figma Export (30 min)
- [ ] Export React project from Figma Make
- [ ] Copy components to `apps/dashboard/components/figma/`
- [ ] Review structure, identify reusable components

#### Weekend 1: Foundation + Core Features
- [ ] Epic 1: Monorepo Setup (Story 1.1)
- [ ] Epic 1: Database Schema (Story 1.2)
- [ ] Epic 1: API Middleware (Story 1.3)
- [ ] Epic 1: Seed Data (Story 1.4)
- [ ] Epic 2: Accounts API (Stories 2.1-2.2)
- [ ] Epic 7: Dashboard Layout (Story 7.1) — use Figma layout components
- [ ] Epic 7: Accounts UI (Story 7.2) — wire Figma components to API
- [ ] Mock providers: Circle, Payout, FX

#### Weekend 2: Agents + Streaming + Polish
- [ ] Epic 3: Agent System (Stories 3.1-3.5)
- [ ] Epic 4: Transfers (Stories 4.1-4.3)
- [ ] Epic 5: Streaming (Stories 5.1-5.5) — math-based, no blockchain
- [ ] Epic 7: Agents UI, Transactions UI, Streams UI (Stories 7.3-7.7)
- [ ] Epic 6: Basic Reports (Story 6.1)

**Deliverable:** Fully functional demo with all features working on mock data.

---

### Phase 1.5: AI Visibility & Demo Polish (Current Sprint)

**Goal:** Make AI-native differentiator visible, polish for investor demos.

#### AI Visibility (Epic 8) — 4-6 hours
- [ ] Story 8.1: Enhanced AI Insights Panel (P0)
- [ ] Story 8.2: Agent Performance Dashboard Card (P0)
- [ ] Story 8.3: Agent Activity Feed (P0)
- [ ] Story 8.4: Transaction Attribution Badges (P0)
- [ ] Story 8.5: Agent Quick Actions (P1)

#### Demo Polish (Epic 9) — 3-4 hours
- [ ] Story 9.1: Reports Page Implementation (P0)
- [ ] Story 9.2: Streams Page Verification (P0)
- [ ] Story 9.3: Empty States (P1)
- [ ] Story 9.4: Loading Skeletons (P1)
- [ ] Story 9.5: Error States (P1)
- [ ] Story 9.6: Global Search Enhancement (P1)
- [ ] Story 9.7: Notifications Center (P2)
- [ ] Story 9.8: Real-Time Balance Animation (P2)

**Deliverable:** Demo where AI story is visible and compelling.

---

### Phase 2: PSP Table Stakes (Partner Credibility)

**Goal:** Add features fintechs expect from any payment infrastructure.

#### P0 — Must Have for Partner Conversations (~5 days) ✅ COMPLETE

**API:**
- [x] Story 10.1: Refunds API (3 pts) ✅
- [x] Story 10.2: Scheduled Transfers API (3 pts) ✅
- [x] Story 10.5: Transaction Exports API (2 pts) ✅

**UI:**
- [x] Story 10.7: Refunds UI (2 pts) ✅
- [x] Story 10.8: Scheduled Transfers UI (2 pts) ✅
- [x] Story 10.11: Exports UI (1 pt) ✅

#### P1 — Should Have for Credibility (~4 days)

**API:**
- [x] Story 10.3: Payment Methods API (2 pts) ✅ (Stubbed)
- [x] Story 10.4: Disputes API (2 pts) ✅
- [x] Story 10.6: Summary Reports API (1 pt) ✅
- [ ] Story 10.12: Tenant Settings API (1 pt)

**UI:**
- [x] Story 10.9: Payment Methods UI (1 pt) ✅
- [x] Story 10.10: Disputes UI (2 pts) ✅

**Deliverable:** PayOS has feature parity with card-based PSPs.

---

### Phase 3: Circle Integration

**Goal:** Add real Circle sandbox for USDC operations.

- [ ] Create Circle sandbox account
- [ ] Implement real Circle provider (replace mock)
- [ ] Wire up deposits/withdrawals
- [ ] Test end-to-end USDC flow
- [ ] Add Circle wallet addresses to accounts

**Deliverable:** "Real" USDC deposits/withdrawals via Circle sandbox.

---

### Phase 4: Superfluid On-Chain

**Goal:** Add on-chain streaming via Superfluid testnet.

- [ ] Set up testnet wallet
- [ ] Get testnet ETH and tokens from faucets
- [ ] Implement Superfluid provider (replace mock)
- [ ] Wire up stream creation/management on-chain
- [ ] Add blockchain explorer links to UI
- [ ] Show real on-chain transaction hashes

**Deliverable:** Real on-chain streams with transaction hashes.

---

### Quick Start: First Hour

```bash
# 1. Clone and install
git clone <repo>
cd payos
pnpm install

# 2. Set up Supabase
# - Create project at supabase.com
# - Run migrations: pnpm --filter @payos/db migrate
# - Seed data: pnpm --filter @payos/db seed

# 3. Configure environment
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 4. Start development
pnpm dev
# Dashboard: http://localhost:3000
# API: http://localhost:4000
```

---

## API Reference

See separate API documentation or the route files for detailed request/response formats.

**Base URL:** `http://localhost:4000/v1` (dev) or `https://api.payos.dev/v1` (prod)

### Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1/accounts | List accounts |
| POST | /v1/accounts | Create account |
| GET | /v1/accounts/:id | Get account |
| GET | /v1/accounts/:id/balances | Get balance breakdown |
| GET | /v1/accounts/:id/agents | Get account's agents |
| GET | /v1/accounts/:id/streams | Get account's streams |
| GET | /v1/agents | List agents |
| POST | /v1/agents | Register agent |
| GET | /v1/agents/:id | Get agent |
| GET | /v1/agents/:id/streams | Get agent's managed streams |
| POST | /v1/agents/:id/suspend | Suspend agent |
| POST | /v1/agents/:id/activate | Activate agent |
| POST | /v1/quotes | Get transfer quote |
| GET | /v1/transfers | List transfers |
| POST | /v1/transfers | Create transfer |
| POST | /v1/internal-transfers | Internal transfer |
| GET | /v1/streams | List streams |
| POST | /v1/streams | Create stream |
| GET | /v1/streams/:id | Get stream |
| POST | /v1/streams/:id/pause | Pause stream |
| POST | /v1/streams/:id/resume | Resume stream |
| POST | /v1/streams/:id/cancel | Cancel stream |
| POST | /v1/streams/:id/top-up | Top up stream |
| POST | /v1/streams/:id/withdraw | Withdraw from stream |
| GET | /v1/reports | List reports |
| POST | /v1/reports/generate | Generate report |

---

## Testing & Demo Scenarios

### Demo 1: Cross-Border Payout
1. Show TechCorp account with $250K balance
2. Get quote for $1,000 USD → MXN
3. Create transfer to Maria Garcia
4. Watch status go pending → processing → completed
5. Show Maria's balance increased

### Demo 2: Agent-Initiated Payroll Stream
1. Show Payroll Autopilot agent under TechCorp
2. Agent creates $2,000/month stream to Carlos
3. Show stream in TechCorp's Streams tab (Managed By: Agent)
4. Show stream in Carlos's incoming Streams
5. Show stream in Agent's Streams tab

### Demo 3: Stream Health Monitoring
1. Show stream with < 7 days runway (warning state)
2. Amber badge, warning banner displayed
3. Click "Top Up" and add funds
4. Health returns to green (healthy)

### Demo 4: Limit Enforcement
1. Agent tries to create stream exceeding maxTotalOutflow
2. Request rejected with clear error message
3. Show agent's limits are capped by parent account

### Demo 5: Reports & Export
1. Navigate to Reports page
2. Select date range and format
3. Generate monthly statement
4. Download as PDF/CSV

---

## Notes for Developers

### Using with Cursor/Claude Code

1. **Start with Epic 1** - Get the foundation right
2. **Run migrations** before coding API routes
3. **Use the types** defined in this PRD
4. **Follow the file structure** for consistency
5. **Test each story** before moving to next

### Key Patterns

- **Multi-tenant:** Always filter by tenant_id
- **Attribution:** Always include initiatedBy on mutations
- **Idempotency:** Use idempotency keys for transfers/streams
- **Audit:** Log all state changes
- **Limits:** Check agent limits before actions

### Mock vs Real

- Circle: Mock for PoC
- Payout Provider: Mock for PoC
- Superfluid: Real on Base Sepolia testnet
- FX Rates: Hardcoded for reliability

---

## Changelog

### Version 1.3 (December 16, 2025)

**New Epic Added:**
- **Epic 12: Client-Side Caching & Data Management** - Comprehensive plan to migrate to React Query (TanStack Query) for intelligent client-side caching
  - 10 stories covering infrastructure setup, hook migration, mutations, optimistic updates, and cache invalidation
  - Event-based and user-triggered refresh strategies
  - Performance monitoring and troubleshooting guides
  - Future consideration for Redis server-side caching noted

**Bug Fixes & Improvements:**
- Fixed agent detail page rendering issues (type icon undefined errors)
- Fixed API response unwrapping in hooks (broke paginated responses)
- Added flat fields to `mapAgentFromDb` for UI compatibility
- Fixed dotenv loading for environment variables in API server
- Restored agent features: types, X-402 protocol status, transaction statistics
- All accounts, agents, and transactions now loading correctly

---

### Version 1.2 (December 14, 2025)

**P1 Stories Completed:**

| Story | Feature | Status |
|-------|---------|--------|
| 10.4 | Disputes API | ✅ Complete |
| 10.6 | Summary Reports API | ✅ Complete |
| 10.9 | Payment Methods UI | ✅ Complete |
| 10.10 | Disputes UI | ✅ Complete |

**API Endpoints Added:**
- `POST /v1/disputes` - Create dispute
- `GET /v1/disputes` - List disputes with filtering
- `GET /v1/disputes/:id` - Get dispute details
- `POST /v1/disputes/:id/respond` - Submit evidence
- `POST /v1/disputes/:id/resolve` - Resolve dispute
- `POST /v1/disputes/:id/escalate` - Escalate dispute
- `GET /v1/disputes/stats/summary` - Dispute statistics
- `GET /v1/reports/summary` - Financial summary report

**UI Features Added:**
- Disputes page with full queue management
- Dispute detail slide-over panel
- Payment Methods tab on Account Detail
- Add Payment Method modal
- Sidebar navigation for Disputes with badge

**Test Coverage Added:**
- Unit tests for Disputes API
- Unit tests for Reports API (summary endpoint)
- Integration tests for Disputes API

---

*End of PRD*