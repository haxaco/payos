'use client';

import { Wallet, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';

const corridors = [
  { from: 'US', to: 'ARG', balance: 850000, currency: 'ARS', utilization: 78, status: 'healthy' },
  { from: 'US', to: 'COL', balance: 420000, currency: 'COP', utilization: 45, status: 'healthy' },
  { from: 'US', to: 'MEX', balance: 125000, currency: 'MXN', utilization: 92, status: 'warning' },
  { from: 'US', to: 'BRA', balance: 680000, currency: 'BRL', utilization: 34, status: 'healthy' },
];

export default function TreasuryPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Treasury</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage liquidity and float across corridors</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <RefreshCw className="h-4 w-4" />
          Rebalance
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">$2.4M</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Float</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+12%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">$1.8M</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Inflows (24h)</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">-8%</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">$1.2M</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Outflows (24h)</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">1</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Corridors Need Attention</div>
        </div>
      </div>

      {/* Corridor Balances */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Corridor Balances</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Corridor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Currency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Utilization</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {corridors.map((corridor, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{corridor.from}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-900 dark:text-white">{corridor.to}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  ${corridor.balance.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {corridor.currency}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          corridor.utilization > 80 ? 'bg-red-500' :
                          corridor.utilization > 60 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${corridor.utilization}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                      {corridor.utilization}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    corridor.status === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {corridor.status === 'warning' ? 'Needs attention' : 'Healthy'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

