'use client';

import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Search, Filter, Plus, Download, User, Building2, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { mockAccounts } from '../data/mockAccounts';
import { Account } from '../types/account';

export function AccountsPage() {
  const navigate = useNavigate();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'person' | 'business'>('all');
  const [showAddMenu, setShowAddMenu] = useState(false);

  const filteredAccounts = useMemo(() => {
    if (activeTab === 'all') return mockAccounts;
    return mockAccounts.filter(a => a.type === activeTab);
  }, [activeTab]);

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

  const getStatusBadge = (status: Account['status']) => {
    const styles = {
      active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
      pending_verification: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
      suspended: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
      closed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
    };
    
    const labels = {
      active: 'Active',
      pending_verification: 'Pending KYC',
      suspended: 'Suspended',
      closed: 'Closed'
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 dark:text-white mb-2">Accounts</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage all account holders</p>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: 'All', count: mockAccounts.length },
          { key: 'person' as const, label: 'Persons', count: mockAccounts.filter(a => a.type === 'person').length },
          { key: 'business' as const, label: 'Businesses', count: mockAccounts.filter(a => a.type === 'business').length },
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
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAccounts.map(account => (
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
                          {account.type === 'person' 
                            ? `${account.firstName} ${account.lastName}`
                            : account.businessName
                          }
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{account.email}</p>
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
                    {getStatusBadge(account.status)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="font-medium text-gray-900 dark:text-white font-mono">
                      ${(account.balance.usd + account.balance.usdc).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    {account.balance.usdc > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        incl. {account.balance.usdc.toLocaleString()} USDC
                      </p>
                    )}
                  </td>
                </tr>
              ))}
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