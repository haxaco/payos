'use client';

import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Users, DollarSign, CreditCard, AlertTriangle, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const volumeData = [
  { month: 'Jul', usArg: 1200, usCol: 840, usMex: 520 },
  { month: 'Aug', usArg: 1350, usCol: 910, usMex: 580 },
  { month: 'Sep', usArg: 1180, usCol: 780, usMex: 640 },
  { month: 'Oct', usArg: 1520, usCol: 1020, usMex: 710 },
  { month: 'Nov', usArg: 1680, usCol: 1150, usMex: 780 },
  { month: 'Dec', usArg: 1240, usCol: 840, usMex: 520 },
];

const recentActivity = [
  { time: '14:32', type: 'Transfer', amount: '$4,800', from: 'TechCorp', to: 'Maria G.', status: 'completed' },
  { time: '14:28', type: 'Card Spend', amount: '$127.50', from: 'Carlos M.', to: 'Amazon', status: 'completed' },
  { time: '14:15', type: 'Deposit', amount: '$10,000', from: 'Acme Inc', to: '', status: 'pending' },
  { time: '14:02', type: 'Withdrawal', amount: '$500', from: 'Ana S.', to: 'Bank', status: 'completed' },
  { time: '13:58', type: 'Transfer', amount: '$2,200', from: 'StartupXYZ', to: 'Juan P.', status: 'flagged' },
];

export function HomePage() {
  const navigate = useNavigate();
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Home</h1>
          <p className="text-gray-600 dark:text-gray-400">December 6, 2025</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Accounts"
          value="12,847"
          change="847 MTD"
          changeType="increase"
          icon={Users}
          onClick={() => navigate('/accounts')}
        />
        <StatCard
          label="Volume"
          value="$2.4M"
          change="18% MTD"
          changeType="increase"
          icon={DollarSign}
          onClick={() => navigate('/transactions')}
        />
        <StatCard
          label="Cards"
          value="8,234"
          change="312 MTD"
          changeType="increase"
          icon={CreditCard}
          onClick={() => navigate('/cards')}
        />
        <StatCard
          label="Pending Flags"
          value="23"
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
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{activity.time}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{activity.type}</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {activity.from} {activity.to && `→ ${activity.to}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{activity.amount}</span>
                    {activity.status === 'completed' && <span className="text-green-600 dark:text-green-400">✓</span>}
                    {activity.status === 'pending' && <span className="text-amber-600 dark:text-amber-400">⏳</span>}
                    {activity.status === 'flagged' && <span className="text-red-600 dark:text-red-400">🚩</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}