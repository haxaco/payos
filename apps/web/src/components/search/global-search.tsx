'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Bot,
  ArrowLeftRight,
  Activity,
  Clock,
  Command,
  X,
  Loader2,
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';

// ============================================
// Types for API response
// ============================================

interface SearchResultAccount {
  id: string;
  name: string;
  type: string;
  email: string | null;
  verificationStatus: string;
}

interface SearchResultAgent {
  id: string;
  name: string;
  status: string;
  description: string | null;
}

interface SearchResultTransfer {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  type: string;
}

interface SearchResultStream {
  id: string;
  description: string | null;
  senderAccountName: string | null;
  receiverAccountName: string | null;
  flowRate: number;
  status: string;
}

interface SearchResponse {
  accounts: SearchResultAccount[];
  agents: SearchResultAgent[];
  transfers: SearchResultTransfer[];
  streams: SearchResultStream[];
}

// Flat item for keyboard navigation
interface FlatResult {
  id: string;
  href: string;
  category: 'accounts' | 'agents' | 'transfers' | 'streams';
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const client = useApiClient();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced API search
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2 || !client) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = new URL('/v1/search', client.baseUrl);
        url.searchParams.set('q', trimmed);

        const res = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${client.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          setResults(null);
          setIsLoading(false);
          return;
        }

        const json = await res.json();
        // API may wrap in { data: ... } via response wrapper middleware
        const data: SearchResponse = json.data ?? json;

        if (!controller.signal.aborted) {
          setResults(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setResults(null);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query, client]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults(null);
      setIsLoading(false);
      abortRef.current?.abort();
    }
  }, [isOpen]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo<FlatResult[]>(() => {
    if (!results) return [];
    return [
      ...results.accounts.map((a) => ({ id: a.id, href: `/dashboard/accounts/${a.id}`, category: 'accounts' as const })),
      ...results.agents.map((a) => ({ id: a.id, href: `/dashboard/agents/${a.id}`, category: 'agents' as const })),
      ...results.transfers.map((t) => ({ id: t.id, href: '/dashboard/transfers', category: 'transfers' as const })),
      ...results.streams.map((s) => ({ id: s.id, href: `/dashboard/streams/${s.id}`, category: 'streams' as const })),
    ];
  }, [results]);

  const handleSelect = useCallback((href: string) => {
    router.push(href);
    onClose();
    setQuery('');
  }, [router, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            handleSelect(flatResults[selectedIndex].href);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex, handleSelect, onClose]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  if (!isOpen) return null;

  const totalResults = flatResults.length;
  const hasQuery = query.trim().length >= 2;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
            <input
              type="text"
              placeholder="Search accounts, agents, transactions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-lg"
              autoFocus
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
              ESC
            </kbd>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {!hasQuery && !isLoading && (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Type at least 2 characters to search
                </p>
              </div>
            )}

            {hasQuery && !isLoading && totalResults === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No results found for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}

            {results && results.accounts.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Accounts
                </div>
                {results.accounts.map((account, i) => {
                  const globalIndex = i;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleSelect(`/dashboard/accounts/${account.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        selectedIndex === globalIndex
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="flex-1">{account.name}</span>
                      <span className="text-xs text-gray-400">{account.type}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {results && results.agents.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Agents
                </div>
                {results.agents.map((agent, i) => {
                  const globalIndex = (results?.accounts.length || 0) + i;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleSelect(`/dashboard/agents/${agent.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        selectedIndex === globalIndex
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Bot className="w-4 h-4" />
                      <span className="flex-1">{agent.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        agent.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                      }`}>{agent.status}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {results && results.transfers.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Transfers
                </div>
                {results.transfers.map((transfer, i) => {
                  const globalIndex = (results?.accounts.length || 0) + (results?.agents.length || 0) + i;
                  return (
                    <button
                      key={transfer.id}
                      onClick={() => handleSelect('/dashboard/transfers')}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        selectedIndex === globalIndex
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span className="flex-1 truncate">{transfer.description || `Transfer ${transfer.id.slice(0, 8)}...`}</span>
                      <span className="text-xs text-gray-400">
                        ${transfer.amount.toLocaleString()} {transfer.currency}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {results && results.streams.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Streams
                </div>
                {results.streams.map((stream, i) => {
                  const globalIndex = (results?.accounts.length || 0) + (results?.agents.length || 0) + (results?.transfers.length || 0) + i;
                  const streamLabel = stream.description
                    || [stream.senderAccountName, stream.receiverAccountName].filter(Boolean).join(' → ')
                    || `Stream ${stream.id.slice(0, 8)}...`;
                  return (
                    <button
                      key={stream.id}
                      onClick={() => handleSelect(`/dashboard/streams/${stream.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        selectedIndex === globalIndex
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span className="flex-1 truncate">{streamLabel}</span>
                      <span className="text-xs text-gray-400">${stream.flowRate.toLocaleString()}/mo</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">↵</kbd>
                to select
              </span>
            </div>
            <span>{isLoading ? 'Searching...' : `${totalResults} results`}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook to manage global search state
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
