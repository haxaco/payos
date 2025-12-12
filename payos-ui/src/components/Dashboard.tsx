import { TrendingUp, TrendingDown, DollarSign, Building2, Users, CreditCard, ArrowUpRight, ArrowDownRight, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const volumeData = [
  { month: 'Jan', value: 28000 },
  { month: 'Feb', value: 35000 },
  { month: 'Mar', value: 42000 },
  { month: 'Apr', value: 45000 },
  { month: 'May', value: 48000 },
  { month: 'Jun', value: 38000 },
  { month: 'Jul', value: 32000 },
  { month: 'Aug', value: 35000 },
  { month: 'Sep', value: 52000 },
];

const recentTransactions = [
  { id: 1, type: 'Transfer to Yanuel Erik', date: '12 January 2024', amount: -30.00, icon: '💸' },
  { id: 2, type: 'Shopping at Okemart', date: '13 January 2024', amount: -16.25, icon: '🛒' },
  { id: 3, type: 'Receive from Yuliano Vidi', date: '07 January 2024', amount: 10.00, icon: '💰' },
];

export function Dashboard() {
  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-black">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's what's happening with your platform.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="xl:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Balance */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
                    ↑ 3.5%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Volume</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">$2.1M</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Increase than last week</div>
              </div>

              {/* Income */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-full">
                    ↓ 3.5%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Employers</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">47</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Decline than last week</div>
              </div>

              {/* Savings */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-full">
                    ↓ 3.5%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Contractors</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">1,243</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Decline than last week</div>
              </div>

              {/* Expenses */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
                    ↑ 3.5%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenue (MTD)</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">$24.5K</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Increase than last week</div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Volume Overview</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Achieved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Target</span>
                    </div>
                  </div>
                </div>
                <select className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Monthly</option>
                  <option>Weekly</option>
                  <option>Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Alert */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">AI Compliance Alert</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">3 transactions flagged for review. AI Copilot has analyzed the risk patterns and prepared recommendations.</p>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Review Flags
                    </button>
                    <button className="px-4 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-800">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Card & Transactions */}
          <div className="space-y-6">
            {/* Card */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Cards</h3>
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors">
                  <span className="text-xl">+</span>
                </button>
              </div>
              
              {/* Card Design */}
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl p-6 mb-4 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                      </svg>
                      <span className="font-semibold">PayOS</span>
                    </div>
                    <span className="text-xl font-bold">VISA</span>
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-2xl font-semibold tracking-wider">
                      •••• •••• •••• 2579
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xs opacity-80 mb-1">Card Holder Name</div>
                      <div className="font-semibold">Richard Azet</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-80 mb-1">Expires Date</div>
                      <div className="font-semibold">12/25</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  Top Up
                </button>
                <button className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                  <ArrowDownRight className="w-4 h-4" />
                  Transfer
                </button>
              </div>

              <button className="w-full mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                see more action
              </button>
            </div>

            {/* History Transaction */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">History Transaction</h3>
              
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                      {transaction.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{transaction.type}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{transaction.date}</div>
                    </div>
                    <div className={`text-sm font-semibold ${transaction.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                      {transaction.amount > 0 ? '+' : '-'} ${Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                See More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
