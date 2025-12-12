import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ArrowUpRight, ArrowDownRight, Send, CreditCard, Plus, Bot } from 'lucide-react';

const recentTransactions = [
  { id: 1, type: 'payout', from: 'TechCorp Inc', amount: '+$2,500', date: 'Today', status: 'completed', icon: 'payout' },
  { id: 2, type: 'card', merchant: 'Amazon', amount: '-$45.99', date: 'Yesterday', status: 'completed', icon: 'card' },
  { id: 3, type: 'agent', from: 'Utility Payment Agent', amount: '-$120.00', date: '2 days ago', status: 'completed', icon: 'agent' },
  { id: 4, type: 'p2p', from: 'Maria Silva', amount: '+$50.00', date: '3 days ago', status: 'completed', icon: 'p2p' },
  { id: 5, type: 'withdrawal', to: 'Bank Account', amount: '-$1,000', date: '5 days ago', status: 'completed', icon: 'withdrawal' }
];

export function MobileHome() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary-100 mb-1">Good morning,</p>
            <h2 className="text-white">Carlos Rodriguez</h2>
          </div>
          <button className="w-10 h-10 bg-primary-700 rounded-full flex items-center justify-center">
            <span className="text-white">CR</span>
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl">
          <p className="text-gray-600 dark:text-gray-400 mb-2">Total Balance</p>
          <h1 className="text-gray-900 dark:text-gray-100 mb-4">$4,234.56</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">USD</p>
              <p className="text-gray-900 dark:text-gray-100">$2,134.56</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">USDC</p>
              <p className="text-gray-900 dark:text-gray-100">2,100.00</p>
            </div>
          </div>

          {/* Pending Payouts */}
          <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
                <span className="text-gray-900 dark:text-gray-100">Pending Payout</span>
              </div>
              <span className="text-primary-700 dark:text-primary-400">+$3,200.00</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1 ml-4">Expected tomorrow</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 -mt-6 mb-6">
        <div className="grid grid-cols-4 gap-3">
          <button className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950 rounded-full flex items-center justify-center">
              <Send className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-gray-900 dark:text-gray-100">Send</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-success-100 dark:bg-success-950 rounded-full flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <span className="text-gray-900 dark:text-gray-100">Withdraw</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-gray-900 dark:text-gray-100">Card</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-950 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
            <span className="text-gray-900 dark:text-gray-100">More</span>
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 dark:text-gray-100">Recent Transactions</h3>
          <button className="text-primary-600 dark:text-primary-400">See All</button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl divide-y divide-gray-200 dark:divide-gray-800">
          {recentTransactions.map((transaction) => (
            <button key={transaction.id} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                transaction.icon === 'payout' ? 'bg-success-100 dark:bg-success-950' :
                transaction.icon === 'card' ? 'bg-gray-100 dark:bg-gray-800' :
                transaction.icon === 'agent' ? 'bg-primary-100 dark:bg-primary-950' :
                transaction.icon === 'p2p' ? 'bg-warning-100 dark:bg-warning-950' :
                'bg-gray-100 dark:bg-gray-800'
              }`}>
                {transaction.icon === 'payout' && <ArrowDownRight className="w-6 h-6 text-success-600 dark:text-success-400" />}
                {transaction.icon === 'card' && <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
                {transaction.icon === 'agent' && <Bot className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
                {transaction.icon === 'p2p' && <Send className="w-6 h-6 text-warning-600 dark:text-warning-400" />}
                {transaction.icon === 'withdrawal' && <ArrowUpRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
              </div>
              <div className="flex-1 text-left">
                <div className="text-gray-900 dark:text-gray-100 mb-0.5">
                  {transaction.type === 'payout' && transaction.from}
                  {transaction.type === 'card' && transaction.merchant}
                  {transaction.type === 'agent' && transaction.from}
                  {transaction.type === 'p2p' && `From ${transaction.from}`}
                  {transaction.type === 'withdrawal' && transaction.to}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">{transaction.date}</span>
                  {transaction.icon === 'agent' && (
                    <Badge variant="primary" size="sm">Agent</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`mb-0.5 ${
                  transaction.amount.startsWith('+') 
                    ? 'text-success-600 dark:text-success-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {transaction.amount}
                </div>
                <Badge variant="success" size="sm">{transaction.status}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 safe-area-pb">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 py-2 text-primary-600 dark:text-primary-400">
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full"></div>
            </div>
            <span>Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400">
            <CreditCard className="w-6 h-6" />
            <span>Card</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>
          <button className="flex flex-col items-center gap-1 py-2 text-gray-600 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
