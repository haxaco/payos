'use client';

import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Users, DollarSign, CreditCard, AlertTriangle, Sparkles, ArrowRight, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardSummary } from '../hooks/api/useDashboard';

export function HomePage() {
  const navigate = useNavigate();
  const { data: summary, isLoading, error } = useDashboardSummary();
  
  // Get current date formatted
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
            Failed to load dashboard
          </h3>
          <p className="text-sm text-red-800 dark:text-red-300">{error.message}</p>
        </div>
      </div>
    );
  }
  
  // Format volume data for chart - use monthly data with corridor breakdown
  const volumeData = (summary?.volume.by_month || []).map(month => {
    const monthName = new Date(month.month).toLocaleDateString('en-US', { month: 'short' });
    return {
      month: monthName,
      usArg: Math.round(month.us_arg_volume / 1000),
      usCol: Math.round(month.us_col_volume / 1000),
      usMex: Math.round(month.us_mex_volume / 1000),
    };
  });

  // Get top corridors for legend (from by_corridor or fallback to monthly data)
  const topCorridors = summary?.volume.by_corridor?.slice(0, 3) || [];
  const corridorColors = ['#2563eb', '#7c3aed', '#9333ea', '#ec4899', '#f59e0b'];
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Home</h1>
          <p className="text-gray-600 dark:text-gray-400">{currentDate}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Accounts"
          value={summary?.accounts.total.toLocaleString() || '0'}
          change={`${summary?.accounts.new_30d || 0} last 30d`}
          changeType="increase"
          icon={Users}
          onClick={() => navigate('/accounts')}
        />
        <StatCard
          label="Volume"
          value={`$${((summary?.volume.total_last_30d || 0) / 1000).toFixed(1)}K`}
          change="Last 30 days"
          changeType="increase"
          icon={DollarSign}
          onClick={() => navigate('/transactions')}
        />
        <StatCard
          label="Cards"
          value={summary?.cards.total.toString() || '0'}
          change={`${summary?.cards.verified || 0} verified`}
          changeType="increase"
          icon={CreditCard}
          onClick={() => navigate('/cards')}
        />
        <StatCard
          label="Pending Flags"
          value={summary?.compliance.open_flags.toString() || '0'}
          change={summary?.compliance.high_risk ? `${summary.compliance.high_risk} high risk` : undefined}
          icon={AlertTriangle}
          onClick={() => navigate('/compliance')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Alert Card */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-900 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">🤖 AI Insights</h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                    <span>3 high-risk flags need review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                    <span>COP float depleting in 36 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-violet-600 dark:text-violet-400 font-bold">•</span>
                    <span>Unusual velocity: TechCorp +340%</span>
                  </li>
                </ul>
                <button 
                  onClick={() => navigate('/compliance')}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Review All
                </button>
              </div>
            </div>
          </div>

          {/* Volume Chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Volume by Corridor</h3>
                {topCorridors.length > 0 ? (
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    {topCorridors.map((corridor, idx) => (
                      <div key={corridor.corridor} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: corridorColors[idx % corridorColors.length] }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">
                          {corridor.corridor} (${(corridor.volume / 1000).toFixed(0)}K)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                      <span className="text-gray-600 dark:text-gray-400">US → ARG</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-violet-600 rounded-sm"></div>
                      <span className="text-gray-600 dark:text-gray-400">US → COL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-sm"></div>
                      <span className="text-gray-600 dark:text-gray-400">US → MEX</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-md">7D</button>
                <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">30D</button>
                <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">90D</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-800" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                  tickFormatter={(value) => `$${value}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="usArg" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="usCol" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="usMex" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Requires Attention */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requires Attention</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/compliance')}
                className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">3 High Risk</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
              <button 
                onClick={() => navigate('/compliance')}
                className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">12 Medium Risk</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
              <button 
                onClick={() => navigate('/compliance')}
                className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">8 Low Risk</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
            </div>
            <button 
              onClick={() => navigate('/compliance')}
              className="w-full mt-4 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
            >
              View Queue
            </button>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <button 
                onClick={() => navigate('/transactions')}
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {(summary?.recent_activity || []).map((activity) => {
                const timeAgo = new Date(activity.time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                return (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{timeAgo}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{activity.type.replace('_', ' ')}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {activity.from} {activity.to && `→ ${activity.to}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                        ${activity.amount.toLocaleString()} {activity.currency}
                      </span>
                      {activity.status === 'completed' && <span className="text-green-600 dark:text-green-400">✓</span>}
                      {activity.status === 'pending' && <span className="text-amber-600 dark:text-amber-400">⏳</span>}
                      {activity.is_flagged && <span className="text-red-600 dark:text-red-400">🚩</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}