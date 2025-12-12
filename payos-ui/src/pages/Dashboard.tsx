import { DollarSign, TrendingUp, Users, Building2, ArrowUpRight, Sparkles, AlertTriangle } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const volumeData = [
  { month: 'Jan', value: 280 },
  { month: 'Feb', value: 320 },
  { month: 'Mar', value: 380 },
  { month: 'Apr', value: 420 },
  { month: 'May', value: 480 },
  { month: 'Jun', value: 520 },
];

const transactions = [
  { id: 1, employer: 'TechCorp Inc', amount: 12450, contractor: '5 contractors', time: '2 min ago', status: 'completed' },
  { id: 2, employer: 'StartupXYZ', amount: 8920, contractor: '3 contractors', time: '15 min ago', status: 'completed' },
  { id: 3, employer: 'Global Services', amount: 15200, contractor: '8 contractors', time: '1 hour ago', status: 'flagged' },
  { id: 4, employer: 'Innovation Labs', amount: 6750, contractor: '2 contractors', time: '2 hours ago', status: 'completed' },
];

export function Dashboard() {
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Dashboard Overview
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Track your platform performance and manage payouts
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Volume"
          value="$2.1M"
          change="12.5%"
          changeType="increase"
          icon={DollarSign}
        />
        <StatCard
          title="Active Employers"
          value="47"
          change="8%"
          changeType="increase"
          icon={Building2}
          iconColor="text-purple-600 dark:text-purple-500"
          iconBgColor="bg-purple-100 dark:bg-purple-950"
        />
        <StatCard
          title="Contractors"
          value="1,243"
          change="15%"
          changeType="increase"
          icon={Users}
          iconColor="text-emerald-600 dark:text-emerald-500"
          iconBgColor="bg-emerald-100 dark:bg-emerald-950"
        />
        <StatCard
          title="Revenue (MTD)"
          value="$24.5K"
          change="18%"
          changeType="increase"
          icon={TrendingUp}
          iconColor="text-amber-600 dark:text-amber-500"
          iconBgColor="bg-amber-100 dark:bg-amber-950"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart - Larger Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                Volume Overview
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Monthly transaction volume in thousands
              </p>
            </div>
            <select className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 6 months</option>
              <option>Last 3 months</option>
              <option>Last year</option>
            </select>
          </div>
          
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-slate-600 dark:text-slate-400"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-slate-600 dark:text-slate-400"
                tickFormatter={(value) => `$${value}k`}
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
              <Bar 
                dataKey="value" 
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                      {transaction.employer}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {transaction.contractor} • {transaction.time}
                    </p>
                  </div>
                  <span className={`
                    px-2 py-1 text-xs font-semibold rounded-full
                    ${transaction.status === 'completed' 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                    }
                  `}>
                    {transaction.status}
                  </span>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ${transaction.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-4 py-2.5 text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors">
            View All Transactions
          </button>
        </div>
      </div>

      {/* AI Alert Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">AI Compliance Alert</h3>
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-xs font-semibold rounded-full">
                3 New
              </span>
            </div>
            <p className="text-blue-100 mb-4">
              High-risk transactions detected. AI Copilot has analyzed the patterns and prepared detailed recommendations for your review.
            </p>
            <div className="flex gap-3">
              <button className="px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg">
                Review Flags
              </button>
              <button className="px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-white/20 transition-colors">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 transition-all duration-200 text-left group">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">New Payout</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">Send payments to contractors</p>
        </button>

        <button className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 transition-all duration-200 text-left group">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Add Employer</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">Onboard new employer</p>
        </button>

        <button className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-950/50 transition-all duration-200 text-left group">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">AI Assistant</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">Ask questions about your data</p>
        </button>
      </div>
    </div>
  );
}
