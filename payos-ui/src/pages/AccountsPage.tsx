'use client';

import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Search, Filter, Plus, Download, User, Building2, ChevronDown, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAccounts } from '../hooks/api';
import type { Account } from '../types/api';

export function AccountsPage() {
  const navigate = useNavigate();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'person' | 'business'>('all');
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Fetch accounts from API with type filter
  const filters = useMemo(() => ({
    type: activeTab !== 'all' ? activeTab : undefined,
    limit: 100, // Fetch up to 100 accounts
  }), [activeTab]);

  const { data, loading, error, refetch } = useAccounts(filters);
  const accounts = data?.data || [];

  const filteredAccounts = useMemo(() => {
    return accounts;
  }, [accounts]);

  const toggleSelect = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedAccounts(prev => 
      prev.length === filteredAccounts.length ? [] : filteredAccounts.map(a => a.id)
    );
  };

  const getVerificationBadge = (status: string) => {
    const styles = {
      verified: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
      pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
      unverified: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
      suspended: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
    };
    
    const labels = {
      verified: 'Verified',
      pending: 'Pending',
      unverified: 'Unverified',
      suspended: 'Suspended',
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.unverified}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // Get all accounts for tab counts (fetch separately without filters)
  const { data: allAccountsData } = useAccounts({ limit: 1000 });
  const allAccounts = allAccountsData?.accounts || [];
  const personCount = allAccounts.filter(a => a.type === 'person').length;
  const businessCount = allAccounts.filter(a => a.type === 'business').length;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 dark:text-white mb-2">Accounts</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage all account holders</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load accounts</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error.message}</p>
            <button 
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Type Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: 'All', count: allAccounts.length },
          { key: 'person' as const, label: 'Persons', count: personCount },
          { key: 'business' as const, label: 'Businesses', count: businessCount },
        ].map(tab => (
          <button 
            key={tab.key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab.key 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} · {tab.count}
          </button>
        ))}
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>

        <button className="flex items-center gap-2 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Download className="w-4 h-4" />
          Export
        </button>

        {/* Add Account Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Account
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showAddMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowAddMenu(false)} 
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button 
                  onClick={() => { setShowAddMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <User className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-200">Add Person</span>
                </button>
                <button 
                  onClick={() => { setShowAddMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-700 dark:text-gray-200">Add Business</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input 
                    type="checkbox"
                    checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Account
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Tier
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                    <td className="px-4 py-4"><div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div></td>
                    <td className="px-4 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredAccounts.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No accounts found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {activeTab !== 'all' 
                        ? `No ${activeTab} accounts exist yet.`
                        : 'Get started by creating your first account.'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(account => (
                  <tr 
                    key={account.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/accounts/${account.id}`)}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedAccounts.includes(account.id)}
                        onChange={() => toggleSelect(account.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {/* Icon based on type */}
                        {account.type === 'person' ? (
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {account.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{account.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                        ${account.type === 'person' 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}
                      >
                        {account.type === 'person' ? (
                          <><User className="w-3 h-3" /> Person</>
                        ) : (
                          <><Building2 className="w-3 h-3" /> Business</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                        T{account.verificationTier}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {getVerificationBadge(account.verificationStatus)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(account.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-medium text-gray-900 dark:text-white font-mono">
                        ${account.balanceTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {account.balanceAvailable !== account.balanceTotal && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${account.balanceAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })} available
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Actions */}
      {selectedAccounts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl px-6 py-4 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedAccounts.length} selected</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Suspend
            </button>
            <button 
              onClick={() => setSelectedAccounts([])}
              className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}