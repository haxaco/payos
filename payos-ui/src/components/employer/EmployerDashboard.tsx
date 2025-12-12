import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Wallet, Users, Send, UserPlus, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

const contractors = [
  { id: 1, name: 'Carlos Rodriguez', avatar: 'CR', status: 'active', balance: '$1,250', nextPayout: 'Tomorrow' },
  { id: 2, name: 'Maria Silva', avatar: 'MS', status: 'active', balance: '$890', nextPayout: 'In 5 days' },
  { id: 3, name: 'Juan Martinez', avatar: 'JM', status: 'active', balance: '$2,100', nextPayout: 'Tomorrow' },
  { id: 4, name: 'Ana Garcia', avatar: 'AG', status: 'pending', balance: '$0', nextPayout: '-' }
];

const recentTransactions = [
  { id: 1, type: 'payout', recipient: 'Carlos Rodriguez', amount: '-$2,500', date: '2 hours ago', status: 'completed' },
  { id: 2, type: 'deposit', recipient: 'Bank Transfer', amount: '+$10,000', date: '1 day ago', status: 'completed' },
  { id: 3, type: 'payout', recipient: 'Maria Silva', amount: '-$1,800', date: '2 days ago', status: 'completed' },
  { id: 4, type: 'payout', recipient: 'Juan Martinez', amount: '-$3,200', date: '3 days ago', status: 'completed' }
];

export function EmployerDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 mb-1">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your contractor payments and wallet</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md">
            <UserPlus className="w-4 h-4" />
            Invite Contractor
          </Button>
          <Button variant="primary" size="md">
            <Send className="w-4 h-4" />
            Pay Contractors
          </Button>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <Card className="bg-gradient-to-br from-primary-600 to-primary-800 border-0 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-primary-100 mb-2">Total Balance</div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-white">$24,580.00</h1>
              <Badge variant="success">
                <ArrowUpRight className="w-3 h-3" />
                +12.5%
              </Badge>
            </div>
          </div>
          <Wallet className="w-8 h-8 text-primary-200" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-primary-500">
          <div>
            <div className="text-primary-100 mb-1">USD Balance</div>
            <div className="text-white">$12,340.00</div>
          </div>
          <div>
            <div className="text-primary-100 mb-1">USDC Balance</div>
            <div className="text-white">12,240 USDC</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="md" className="flex-1">
            <ArrowDownRight className="w-4 h-4" />
            Fund Wallet
          </Button>
          <Button variant="ghost" size="md" className="flex-1 text-white hover:bg-primary-700">
            <Calendar className="w-4 h-4" />
            View History
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contractors Overview */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 dark:text-gray-100">Contractors</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="text-gray-600 dark:text-gray-400 mb-1">Active</div>
              <div className="text-gray-900 dark:text-gray-100">12</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400 mb-1">Pending</div>
              <div className="text-warning-600 dark:text-warning-400">3</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400 mb-1">Payouts Due</div>
              <div className="text-primary-600 dark:text-primary-400">5</div>
            </div>
          </div>

          <div className="space-y-3">
            {contractors.map((contractor) => (
              <div key={contractor.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{contractor.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 dark:text-gray-100 mb-0.5">{contractor.name}</div>
                  <div className="text-gray-600 dark:text-gray-400">Next: {contractor.nextPayout}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-900 dark:text-gray-100 mb-0.5">{contractor.balance}</div>
                  {contractor.status === 'active' ? (
                    <Badge variant="success" size="sm">Active</Badge>
                  ) : (
                    <Badge variant="warning" size="sm">Pending</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 dark:text-gray-100">Recent Transactions</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'deposit' 
                      ? 'bg-success-100 dark:bg-success-950' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {transaction.type === 'deposit' ? (
                      <ArrowDownRight className="w-5 h-5 text-success-600 dark:text-success-400" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-gray-900 dark:text-gray-100">{transaction.recipient}</div>
                    <div className="text-gray-600 dark:text-gray-400">{transaction.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`mb-0.5 ${
                    transaction.type === 'deposit' 
                      ? 'text-success-600 dark:text-success-400' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {transaction.amount}
                  </div>
                  <Badge variant="success" size="sm">{transaction.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upcoming Scheduled Payouts */}
      <Card>
        <h3 className="text-gray-900 dark:text-gray-100 mb-4">Upcoming Scheduled Payouts</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-600 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-gray-900 dark:text-gray-100 mb-1">Monthly Payroll - 5 contractors</div>
                <div className="text-gray-600 dark:text-gray-400">Scheduled for tomorrow at 9:00 AM</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-900 dark:text-gray-100 mb-1">$12,450.00</div>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <div className="text-gray-900 dark:text-gray-100 mb-1">Bi-weekly Payroll - 3 contractors</div>
                <div className="text-gray-600 dark:text-gray-400">Scheduled for June 15 at 9:00 AM</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-gray-900 dark:text-gray-100 mb-1">$7,800.00</div>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
