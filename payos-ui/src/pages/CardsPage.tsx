import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { CreditCard, TrendingUp, Plus, Search, Filter, Loader2, AlertCircle } from 'lucide-react';
import { usePaymentMethods } from '../hooks/api';

export function CardsPage() {
  const navigate = useNavigate();
  
  // Fetch payment methods filtered by type='card'
  const { data, loading, error, refetch } = usePaymentMethods({ 
    type: 'card',
    limit: 100,
  });
  
  const paymentMethods = data?.payment_methods || [];
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Cards</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage all issued cards</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load payment methods</h3>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total" 
          value={loading ? '...' : paymentMethods.length.toString()} 
          icon={CreditCard} 
        />
        <StatCard 
          label="Active" 
          value={loading ? '...' : paymentMethods.filter(pm => pm.is_verified).length.toString()} 
        />
        <StatCard 
          label="Default" 
          value={loading ? '...' : paymentMethods.filter(pm => pm.is_default).length.toString()} 
        />
        <StatCard 
          label="Verified" 
          value={loading ? '...' : `${Math.round((paymentMethods.filter(pm => pm.is_verified).length / (paymentMethods.length || 1)) * 100)}%`}
        />
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search cards..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Type
        </button>
        <button className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Status
        </button>
        <button className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Issue Card
        </button>
      </div>

      {/* Cards Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Card</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Account</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                  <td className="px-4 py-4"><div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                  <td className="px-4 py-4 text-right"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : paymentMethods.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No cards found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Issue your first card to get started.
                  </p>
                </td>
              </tr>
            ) : (
              paymentMethods.map((pm) => (
                <tr 
                  key={pm.id} 
                  onClick={() => navigate(`/cards/${pm.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                      •••• {pm.bank_account_last_four || '****'}
                    </div>
                    {pm.label && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pm.label}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {pm.bank_account_holder || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {pm.type}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="neutral" size="sm">Card</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge 
                      variant={pm.is_verified ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {pm.is_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    {pm.is_default && (
                      <Badge variant="info" size="sm" className="ml-1">Default</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(pm.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}