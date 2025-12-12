'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';

// Mock search results for demo
const mockSearchData = {
  accounts: [
    { id: 'acc-1', name: 'TechCorp Inc', type: 'business', href: '/dashboard/accounts/acc-1' },
    { id: 'acc-2', name: 'Maria Garcia', type: 'person', href: '/dashboard/accounts/acc-2' },
    { id: 'acc-3', name: 'Carlos Martinez', type: 'person', href: '/dashboard/accounts/acc-3' },
    { id: 'acc-4', name: 'GlobalPay Ltd', type: 'business', href: '/dashboard/accounts/acc-4' },
  ],
  agents: [
    { id: 'agent-1', name: 'Payroll Autopilot', status: 'active', href: '/dashboard/agents/agent-1' },
    { id: 'agent-2', name: 'Treasury Manager', status: 'active', href: '/dashboard/agents/agent-2' },
    { id: 'agent-3', name: 'Subscription Bot', status: 'paused', href: '/dashboard/agents/agent-3' },
  ],
  transactions: [
    { id: 'txn-1', description: 'Payment to Maria Garcia', amount: 2000, href: '/dashboard/transfers' },
    { id: 'txn-2', description: 'Salary stream to Carlos', amount: 4500, href: '/dashboard/transfers' },
    { id: 'txn-3', description: 'Treasury rebalance', amount: 10000, href: '/dashboard/transfers' },
  ],
  streams: [
    { id: 'stream-1', name: 'Maria Garcia Salary', flowRate: 2000, href: '/dashboard/streams/stream-1' },
    { id: 'stream-2', name: 'Carlos Monthly', flowRate: 3000, href: '/dashboard/streams/stream-2' },
  ],
};

const recentSearches = ['TechCorp', 'Payroll', 'Maria'];

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter results based on query
  const results = useMemo(() => {
    if (!query.trim()) return null;
    
    const q = query.toLowerCase();
    
    return {
      accounts: mockSearchData.accounts.filter(a => 
        a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)
      ),
      agents: mockSearchData.agents.filter(a => 
        a.name.toLowerCase().includes(q)
      ),
      transactions: mockSearchData.transactions.filter(t => 
        t.description.toLowerCase().includes(q)
      ),
      streams: mockSearchData.streams.filter(s => 
        s.name.toLowerCase().includes(q)
      ),
    };
  }, [query]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    if (!results) return [];
    return [
      ...results.accounts.map(a => ({ ...a, category: 'accounts' })),
      ...results.agents.map(a => ({ ...a, category: 'agents' })),
      ...results.transactions.map(t => ({ ...t, category: 'transactions' })),
      ...results.streams.map(s => ({ ...s, category: 'streams' })),
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

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = flatResults.length;

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
            <Search className="w-5 h-5 text-gray-400" />
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
            {!query && (
              <div className="p-4">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Recent Searches
                </div>
                <div className="space-y-1">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query && totalResults === 0 && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-500 dark:text-gray-400">
                  No results found for "{query}"
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
                      onClick={() => handleSelect(account.href)}
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
                      onClick={() => handleSelect(agent.href)}
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

            {results && results.streams.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Streams
                </div>
                {results.streams.map((stream, i) => {
                  const globalIndex = (results?.accounts.length || 0) + (results?.agents.length || 0) + (results?.transactions.length || 0) + i;
                  return (
                    <button
                      key={stream.id}
                      onClick={() => handleSelect(stream.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        selectedIndex === globalIndex
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span className="flex-1">{stream.name}</span>
                      <span className="text-xs text-gray-400">${stream.flowRate}/mo</span>
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
            <span>{totalResults} results</span>
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

