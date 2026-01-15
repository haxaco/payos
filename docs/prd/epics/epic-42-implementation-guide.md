# Epic 42: Implementation Guide for Gemini

> **Purpose:** This document provides explicit, copy-paste-ready implementation instructions for each story in Epic 42. Follow these patterns exactly.

---

## Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Code Patterns Reference](#code-patterns-reference)
3. [Story 42.1: Dual Balance Display](#story-421-dual-balance-display)
4. [Story 42.2: BYOW Verification](#story-422-byow-verification)
5. [Story 42.5: FX Calculator Page](#story-425-fx-calculator-page)
6. [Story 42.6: Inline FX Preview](#story-426-inline-fx-preview)
7. [Story 42.8: Settlement Tab](#story-428-settlement-tab)
8. [Story 42.9: Mandate List Actions](#story-429-mandate-list-actions)
9. [Story 42.11: Compliance Screening Tab](#story-4211-compliance-screening-tab)
10. [Story 42.14: Dashboard Real Balances](#story-4214-dashboard-real-balances)

---

## Prerequisites & Setup

### Required Dependencies (Story 42.2 only)

```bash
cd apps/web
pnpm add wagmi viem @tanstack/react-query
```

### API Base URL
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

### Authentication Token
```typescript
const token = localStorage.getItem('access_token');
```

---

## Code Patterns Reference

### Pattern 1: Standard Page Structure

Every dashboard page follows this exact pattern:

```typescript
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { CardListSkeleton, TableSkeleton } from '@/components/ui/skeletons';

export default function SomePage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const queryClient = useQueryClient();

  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: ['some-key', 'page', pagination.page],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.someEndpoint.list({ page: pagination.page, limit: pagination.pageSize });
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  // Extract data from response
  const rawData = (data as any)?.data;
  const items = Array.isArray(rawData) ? rawData : (rawData?.data || []);

  if (isAuthLoading) {
    return <CardListSkeleton count={5} />;
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Content */}
    </div>
  );
}
```

### Pattern 2: Direct API Call (when API client doesn't have the method)

```typescript
const fetchBalance = async (walletId: string) => {
  const response = await fetch(`${API_URL}/v1/wallets/${walletId}/balance`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Failed to fetch balance');
  return response.json();
};

// Usage with React Query
const { data: balanceData } = useQuery({
  queryKey: ['wallet-balance', walletId],
  queryFn: () => fetchBalance(walletId),
  enabled: !!walletId,
  refetchInterval: 60000, // Refresh every minute
});
```

### Pattern 3: Mutation with Optimistic Update

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const activateMutation = useMutation({
  mutationFn: async (mandateId: string) => {
    const response = await fetch(`${API_URL}/v1/ap2/mandates/${mandateId}/activate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to activate mandate');
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ap2-mandates'] });
  },
});
```

---

## Story 42.1: Dual Balance Display

### File to Modify
`apps/web/src/app/dashboard/wallets/page.tsx`

### API Endpoint
```
GET /v1/wallets/:id/balance
```

### API Response Shape
```typescript
interface WalletBalanceResponse {
  data: {
    walletId: string;
    onChain: {
      usdc: string;      // "12448.32"
      native: string;    // "0.02" (ETH)
      lastSyncedAt: string;
      blockNumber: number;
    };
    ledger: {
      available: string;
      pending: string;
      total: string;
    };
    syncStatus: 'synced' | 'pending' | 'stale';
  };
}
```

### Implementation Steps

**Step 1: Add balance fetching hook at top of file**

```typescript
// Add after existing imports
import { formatDistanceToNow } from 'date-fns';

// Add this hook inside the component, after existing hooks
const useWalletBalance = (walletId: string | undefined) => {
  return useQuery({
    queryKey: ['wallet-balance', walletId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/v1/wallets/${walletId}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!walletId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refresh every minute
  });
};
```

**Step 2: Create WalletBalanceCard component**

Add this new component after the imports section:

```typescript
interface WalletBalanceCardProps {
  wallet: Wallet;
}

function WalletBalanceCard({ wallet }: WalletBalanceCardProps) {
  const { data: balanceData, isLoading: balanceLoading } = useWalletBalance(wallet.id);
  const onChain = balanceData?.data?.onChain;
  const syncStatus = balanceData?.data?.syncStatus || 'stale';

  // Sync indicator color
  const syncColor = {
    synced: 'bg-green-500',
    pending: 'bg-yellow-500',
    stale: 'bg-red-500',
  }[syncStatus];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <WalletIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {wallet.name || 'Unnamed Wallet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {wallet.purpose || wallet.currency}
            </p>
          </div>
        </div>
        {/* Sync indicator */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${syncColor}`} />
          <span className="text-xs text-gray-500">
            {syncStatus === 'synced' ? 'Synced' : syncStatus === 'pending' ? 'Syncing...' : 'Stale'}
          </span>
        </div>
      </div>

      {/* Ledger Balance */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available (Ledger)</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          ${wallet.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })} {wallet.currency}
        </p>
      </div>

      {/* On-Chain Balance */}
      {onChain && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">On-Chain (Base Sepolia)</p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                ${parseFloat(onChain.usdc).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
              </span>
              {parseFloat(onChain.native) > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  {parseFloat(onChain.native).toFixed(4)} ETH
                </span>
              )}
            </div>
            {wallet.walletAddress && (
              <a
                href={`https://sepolia.basescan.org/address/${wallet.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View ↗
              </a>
            )}
          </div>
          {onChain.lastSyncedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last synced {formatDistanceToNow(new Date(onChain.lastSyncedAt))} ago
            </p>
          )}
        </div>
      )}

      {balanceLoading && !onChain && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      )}
    </div>
  );
}
```

**Step 3: Replace existing wallet grid render**

Find this section in the render:
```typescript
{wallets.map((wallet: Wallet) => (
```

Replace the wallet card content with:
```typescript
{wallets.map((wallet: Wallet) => (
  <WalletBalanceCard key={wallet.id} wallet={wallet} />
))}
```

---

## Story 42.2: BYOW Verification

### Files to Modify
1. `apps/web/src/app/dashboard/wallets/page.tsx`
2. `apps/web/package.json` (add wagmi, viem)

### API Endpoint
```
POST /v1/wallets/:id/verify
Body: { signature: string, message: string }
```

### Implementation Steps

**Step 1: Install dependencies**
```bash
cd apps/web && pnpm add wagmi viem @tanstack/react-query
```

**Step 2: Add wagmi config** 

Create file `apps/web/src/lib/wagmi-config.ts`:

```typescript
import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
  },
});
```

**Step 3: Add WagmiProvider to layout**

Modify `apps/web/src/app/layout.tsx` to wrap with WagmiProvider:

```typescript
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi-config';

// Wrap children with:
<WagmiProvider config={wagmiConfig}>
  {children}
</WagmiProvider>
```

**Step 4: Add verification button to wallet card**

Add to `WalletBalanceCard` component after sync indicator:

```typescript
import { useAccount, useSignMessage } from 'wagmi';

// Inside WalletBalanceCard component:
const { address, isConnected } = useAccount();
const { signMessageAsync } = useSignMessage();
const [verifying, setVerifying] = useState(false);

const handleVerify = async () => {
  if (!wallet.walletAddress || !isConnected) return;
  
  setVerifying(true);
  try {
    // Generate challenge message
    const message = `Verify ownership of wallet ${wallet.walletAddress} for PayOS at ${new Date().toISOString()}`;
    
    // Sign with MetaMask
    const signature = await signMessageAsync({ message });
    
    // Submit to backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ''}/v1/wallets/${wallet.id}/verify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signature, message }),
      }
    );
    
    if (!response.ok) throw new Error('Verification failed');
    
    // Refresh wallet data
    queryClient.invalidateQueries({ queryKey: ['wallets'] });
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    setVerifying(false);
  }
};

// In the render, add verification status badge:
{wallet.verificationStatus === 'verified' ? (
  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
    ✓ Verified
  </span>
) : wallet.walletAddress && (
  <button
    onClick={handleVerify}
    disabled={verifying || !isConnected}
    className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 disabled:opacity-50"
  >
    {verifying ? 'Verifying...' : 'Verify Ownership'}
  </button>
)}
```

---

## Story 42.5: FX Calculator Page

### File to Create
`apps/web/src/app/dashboard/fx/page.tsx`

### API Endpoints
```
GET  /v1/quotes/fx/corridors
POST /v1/quotes/fx
POST /v1/quotes/fx/lock
```

### Full Page Implementation

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowRight, RefreshCw, Lock, Clock, AlertCircle } from 'lucide-react';
import { useApiConfig } from '@/lib/api-client';

interface FXQuote {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  fxRate: number;
  fees: {
    total: number;
    breakdown: Array<{ type: string; amount: number; description: string }>;
  };
  expiresAt: string;
  estimatedSettlement: string;
}

interface Corridor {
  from: string;
  to: string;
  name: string;
  settlementTime: string;
  available: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function FXCalculatorPage() {
  const { isConfigured } = useApiConfig();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('BRL');
  const [amount, setAmount] = useState('1000');
  const [quote, setQuote] = useState<FXQuote | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [locked, setLocked] = useState(false);

  // Fetch corridors
  const { data: corridorsData } = useQuery({
    queryKey: ['fx-corridors'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/v1/quotes/fx/corridors`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      return response.json();
    },
    enabled: isConfigured,
  });

  const corridors: Corridor[] = corridorsData?.data || [
    { from: 'USD', to: 'BRL', name: 'USD → BRL', settlementTime: '2-5 min (Pix)', available: true },
    { from: 'USD', to: 'MXN', name: 'USD → MXN', settlementTime: '1-3 min (SPEI)', available: true },
    { from: 'USDC', to: 'BRL', name: 'USDC → BRL', settlementTime: '2-5 min (Pix)', available: true },
  ];

  // Fetch quote
  const fetchQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    const response = await fetch(`${API_URL}/v1/quotes/fx`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: fromCurrency,
        destination: toCurrency,
        amount: parseFloat(amount),
      }),
    });
    
    const data = await response.json();
    setQuote(data.data);
    setLocked(false);
  }, [fromCurrency, toCurrency, amount]);

  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  // Expiration countdown
  useEffect(() => {
    if (!quote?.expiresAt) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(quote.expiresAt).getTime() - Date.now());
      setExpiresIn(Math.floor(remaining / 1000));
      
      if (remaining <= 0) {
        setQuote(null);
        fetchQuote();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [quote?.expiresAt, fetchQuote]);

  // Lock quote mutation
  const lockMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/v1/quotes/fx/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quoteId: quote?.id }),
      });
      return response.json();
    },
    onSuccess: () => setLocked(true),
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">FX Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Get real-time exchange rates and lock quotes for cross-border transfers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calculator Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Convert</h2>
          
          {/* From */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From
            </label>
            <div className="flex gap-3">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="USD">USD</option>
                <option value="USDC">USDC</option>
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center my-4">
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </div>

          {/* To */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To
            </label>
            <div className="flex gap-3">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="BRL">BRL (Brazilian Real)</option>
                <option value="MXN">MXN (Mexican Peso)</option>
              </select>
              <div className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {quote ? quote.toAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Rate & Expiration */}
          {quote && (
            <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  1 {fromCurrency} = {quote.fxRate.toFixed(4)} {toCurrency}
                </span>
                <button onClick={fetchQuote} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className={`text-sm font-medium ${expiresIn < 30 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                  Expires in {formatTime(expiresIn)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => lockMutation.mutate()}
              disabled={!quote || locked || lockMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <Lock className="h-4 w-4" />
              {locked ? 'Locked ✓' : 'Lock Rate'}
            </button>
            <button
              disabled={!quote}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Create Transfer →
            </button>
          </div>
        </div>

        {/* Fee Breakdown Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Fee Breakdown</h2>
          
          {quote ? (
            <div className="space-y-4">
              {quote.fees.breakdown.map((fee, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">{fee.description}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${fee.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Total Fees</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${quote.fees.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 dark:text-green-300">Recipient receives</span>
                  <span className="text-lg font-bold text-green-800 dark:text-green-300">
                    {toCurrency} {quote.toAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                <Clock className="h-4 w-4" />
                <span>Estimated settlement: {quote.estimatedSettlement}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p>Enter an amount to see fee breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Corridors Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Corridors</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Corridor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Settlement</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {corridors.map((corridor, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{corridor.name}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{corridor.settlementTime}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      corridor.available 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {corridor.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### Add to Sidebar Navigation

Modify `apps/web/src/components/layout/sidebar.tsx` to add FX Calculator link:

```typescript
// Find the navigation items array and add:
{
  name: 'FX Calculator',
  href: '/dashboard/fx',
  icon: DollarSign, // Import from lucide-react
}
```

---

## Story 42.8: Settlement Tab

### File to Modify
`apps/web/src/app/dashboard/transfers/[id]/page.tsx`

### API Endpoint
```
GET /v1/settlements/:settlementId
```

### Implementation

Add a tabs component and settlement timeline. Here's the settlement tab content:

```typescript
// Add to transfer detail page

interface SettlementStep {
  label: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp?: string;
  details?: string;
}

function SettlementTab({ transfer }: { transfer: Transfer }) {
  const settlementId = (transfer as any).settlementId;
  
  const { data: settlementData } = useQuery({
    queryKey: ['settlement', settlementId],
    queryFn: async () => {
      if (!settlementId) return null;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/v1/settlements/${settlementId}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        }
      );
      return response.json();
    },
    enabled: !!settlementId,
  });

  const settlement = settlementData?.data;

  // Build timeline from settlement data
  const steps: SettlementStep[] = [
    {
      label: 'Payment Received',
      status: 'completed',
      timestamp: transfer.createdAt,
    },
    {
      label: 'Compliance Check',
      status: settlement?.complianceCleared ? 'completed' : 'in_progress',
      timestamp: settlement?.complianceClearedAt,
      details: settlement?.complianceCleared ? 'Passed' : 'In progress',
    },
    {
      label: 'FX Conversion',
      status: settlement?.fxExecuted ? 'completed' : (settlement?.complianceCleared ? 'in_progress' : 'pending'),
      timestamp: settlement?.fxExecutedAt,
      details: settlement?.fxRate ? `Rate: ${settlement.fxRate}` : undefined,
    },
    {
      label: `${settlement?.rail || 'Pix'} Payout Processing`,
      status: settlement?.payoutInitiated ? (settlement?.payoutCompleted ? 'completed' : 'in_progress') : 'pending',
      timestamp: settlement?.payoutInitiatedAt,
      details: settlement?.circlePayoutId ? `Circle ID: ${settlement.circlePayoutId}` : undefined,
    },
    {
      label: 'Settlement Complete',
      status: settlement?.payoutCompleted ? 'completed' : 'pending',
      timestamp: settlement?.completedAt,
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Settlement Timeline</h3>
      
      <div className="relative">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4 pb-8 last:pb-0">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 ${
                step.status === 'completed' 
                  ? 'bg-green-500 border-green-500' 
                  : step.status === 'in_progress'
                    ? 'bg-blue-500 border-blue-500 animate-pulse'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}>
                {step.status === 'completed' && (
                  <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-0.5 flex-1 ${
                  step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <span className={`font-medium ${
                  step.status === 'pending' ? 'text-gray-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {step.label}
                </span>
                {step.timestamp && (
                  <span className="text-sm text-gray-500">
                    {new Date(step.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              {step.details && (
                <p className="text-sm text-gray-500 mt-1">{step.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* On-Chain Reference */}
      {settlement?.txHash && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">On-Chain Reference</p>
          <div className="flex items-center justify-between">
            <code className="text-sm text-gray-600 dark:text-gray-400">
              {settlement.txHash.slice(0, 10)}...{settlement.txHash.slice(-8)}
            </code>
            <a
              href={`https://sepolia.basescan.org/tx/${settlement.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View on BaseScan ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Story 42.9: Mandate List Actions

### File to Modify
`apps/web/src/app/dashboard/agentic-payments/ap2/mandates/page.tsx`

### API Endpoints
```
POST /v1/ap2/mandates/:id/activate
POST /v1/ap2/mandates/:id/suspend
POST /v1/ap2/mandates/:id/revoke
```

### Add Action Dropdown Component

```typescript
import { MoreVertical, Play, Pause, XCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface MandateActionsProps {
  mandate: Mandate;
}

function MandateActions({ mandate }: MandateActionsProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/v1/ap2/mandates/${mandate.id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!response.ok) throw new Error('Failed to activate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap2-mandates'] });
      setOpen(false);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/v1/ap2/mandates/${mandate.id}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!response.ok) throw new Error('Failed to suspend');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap2-mandates'] });
      setOpen(false);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/v1/ap2/mandates/${mandate.id}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!response.ok) throw new Error('Failed to revoke');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap2-mandates'] });
      setOpen(false);
    },
  });

  // Determine available actions based on status
  const actions = [];
  if (mandate.status === 'pending' || mandate.status === 'suspended') {
    actions.push({
      label: 'Activate',
      icon: Play,
      onClick: () => activateMutation.mutate(),
      loading: activateMutation.isPending,
    });
  }
  if (mandate.status === 'active') {
    actions.push({
      label: 'Suspend',
      icon: Pause,
      onClick: () => suspendMutation.mutate(),
      loading: suspendMutation.isPending,
    });
  }
  if (mandate.status !== 'revoked' && mandate.status !== 'completed') {
    actions.push({
      label: 'Revoke',
      icon: XCircle,
      onClick: () => {
        if (confirm('Are you sure you want to revoke this mandate? This cannot be undone.')) {
          revokeMutation.mutate();
        }
      },
      loading: revokeMutation.isPending,
      danger: true,
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.loading}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                action.danger
                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              <action.icon className="h-4 w-4" />
              {action.loading ? 'Processing...' : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Add `<MandateActions mandate={mandate} />` to each row in the mandates table.

---

## Story 42.11: Compliance Screening Tab

### File to Modify
`apps/web/src/app/dashboard/compliance/page.tsx`

### API Endpoints
```
POST /v1/compliance/screen/wallet
POST /v1/compliance/screen/entity
POST /v1/compliance/screen/bank
```

### Implementation

Add tab navigation and screening form:

```typescript
// At top of file, add state for active tab
const [activeTab, setActiveTab] = useState<'flags' | 'screen' | 'history'>('flags');

// Add tab navigation after header
<div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
  {[
    { id: 'flags', label: 'Flags' },
    { id: 'screen', label: 'Screen' },
    { id: 'history', label: 'History' },
  ].map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id as typeof activeTab)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab.id
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>

// Render content based on active tab
{activeTab === 'flags' && (
  // Existing flags list content
)}

{activeTab === 'screen' && (
  <ScreeningTab />
)}

{activeTab === 'history' && (
  <ScreeningHistoryTab />
)}
```

**ScreeningTab Component:**

```typescript
function ScreeningTab() {
  const [screenType, setScreenType] = useState<'wallet' | 'entity' | 'bank'>('wallet');
  const [formData, setFormData] = useState({
    // Wallet
    address: '',
    chain: 'base',
    // Entity
    name: '',
    type: 'individual',
    country: '',
    // Bank
    accountType: 'pix',
    accountId: '',
    bankCountry: 'BR',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const handleScreen = async () => {
    setLoading(true);
    setResult(null);

    try {
      let endpoint = '';
      let body = {};

      switch (screenType) {
        case 'wallet':
          endpoint = '/v1/compliance/screen/wallet';
          body = { address: formData.address, chain: formData.chain, context: 'manual_review' };
          break;
        case 'entity':
          endpoint = '/v1/compliance/screen/entity';
          body = { name: formData.name, type: formData.type, country: formData.country };
          break;
        case 'bank':
          endpoint = '/v1/compliance/screen/bank';
          body = { account_type: formData.accountType, account_id: formData.accountId, country: formData.bankCountry };
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data.data);
    } catch (error) {
      console.error('Screening failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const riskLevelColor = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    SEVERE: 'bg-red-100 text-red-800',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Run Screening</h3>

        {/* Type Selector */}
        <div className="flex gap-2 mb-6">
          {(['wallet', 'entity', 'bank'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setScreenType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                screenType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Wallet Form */}
        {screenType === 'wallet' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chain
              </label>
              <select
                value={formData.chain}
                onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="base">Base</option>
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
              </select>
            </div>
          </div>
        )}

        {/* Entity Form */}
        {screenType === 'entity' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name or company name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="BR, US, MX..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>
        )}

        {/* Bank Form */}
        {screenType === 'bank' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Type
              </label>
              <select
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="pix">Pix (Brazil)</option>
                <option value="spei">SPEI (Mexico)</option>
                <option value="ach">ACH (US)</option>
                <option value="wire">Wire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account ID / Key
              </label>
              <input
                type="text"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                placeholder="CPF, CLABE, or account number"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleScreen}
          disabled={loading}
          className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Screening...' : 'Run Screening'}
        </button>
      </div>

      {/* Result */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Result</h3>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Risk Level</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                riskLevelColor[result.result?.risk_level as keyof typeof riskLevelColor] || 'bg-gray-100'
              }`}>
                {result.result?.risk_level || 'UNKNOWN'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Risk Score</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {result.result?.risk_score || 0}/100
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Provider</span>
              <span className="text-gray-900 dark:text-white">
                {result.result?.provider || 'mock'}
              </span>
            </div>

            {result.result?.flags?.length > 0 && (
              <div>
                <span className="text-gray-600 dark:text-gray-400 block mb-2">Flags</span>
                <ul className="space-y-1">
                  {result.result.flags.map((flag: string, i: number) => (
                    <li key={i} className="text-sm text-red-600">{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-sm text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
              Screened at {new Date(result.timestamp || Date.now()).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Shield className="h-12 w-12 mb-4" />
            <p>Run a screening to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Story 42.14: Dashboard Real Balances

### File to Modify
`apps/web/src/app/dashboard/page.tsx`

### Implementation

Replace mock volume/balance cards with real data:

```typescript
// Add query for wallet balances
const { data: walletsData } = useQuery({
  queryKey: ['wallets-summary'],
  queryFn: async () => {
    if (!api) throw new Error('API client not initialized');
    return api.wallets.list({ limit: 100 });
  },
  enabled: !!api && isConfigured,
  staleTime: 60 * 1000,
});

// Calculate total balance
const wallets = (walletsData as any)?.data?.data || (walletsData as any)?.data || [];
const totalBalance = wallets.reduce((sum: number, wallet: any) => sum + (wallet.balance || 0), 0);

// Add query for transfer volume
const { data: transfersData } = useQuery({
  queryKey: ['transfers-volume'],
  queryFn: async () => {
    if (!api) throw new Error('API client not initialized');
    // Get transfers from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return api.transfers.list({ limit: 100 });
  },
  enabled: !!api && isConfigured,
  staleTime: 60 * 1000,
});

// Calculate 24h volume
const transfers = (transfersData as any)?.data?.data || (transfersData as any)?.data || [];
const volume24h = transfers
  .filter((t: any) => new Date(t.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000))
  .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

// Use in cards:
<div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
  <p className="text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
  </p>
  <p className="text-sm text-gray-500 mt-2">
    Across {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
  </p>
</div>

<div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
  <p className="text-sm text-gray-500 dark:text-gray-400">24h Volume</p>
  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
    ${volume24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
  </p>
  <p className="text-sm text-gray-500 mt-2">
    {transfers.filter((t: any) => new Date(t.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length} transactions
  </p>
</div>
```

---

## Testing Checklist

After each story, verify:

- [ ] Page loads without console errors
- [ ] Data fetches correctly from API
- [ ] Loading states display properly
- [ ] Error states are handled
- [ ] Dark mode styling works
---

## Files Summary

| Story | File | Action |
|-------|------|--------|
| 42.1 | `apps/web/src/app/dashboard/wallets/page.tsx` | Modify |
| 42.2 | `apps/web/src/lib/wagmi-config.ts` | Create |
| 42.2 | `apps/web/src/app/layout.tsx` | Modify |
| 42.2 | `apps/web/src/app/dashboard/wallets/page.tsx` | Modify |
| 42.5 | `apps/web/src/app/dashboard/fx/page.tsx` | Create |
| 42.5 | `apps/web/src/components/layout/sidebar.tsx` | Modify |
| 42.8 | `apps/web/src/app/dashboard/transfers/[id]/page.tsx` | Modify |
| 42.9 | `apps/web/src/app/dashboard/agentic-payments/ap2/mandates/page.tsx` | Modify |
| 42.11 | `apps/web/src/app/dashboard/compliance/page.tsx` | Modify |
| 42.14 | `apps/web/src/app/dashboard/page.tsx` | Modify |

---

*Created: January 5, 2026*  
*For use by: Gemini AI / Other LLMs*

