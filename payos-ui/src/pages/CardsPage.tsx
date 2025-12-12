import { Page } from '../App';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { CreditCard, TrendingUp, Plus, Search, Filter } from 'lucide-react';

interface CardsPageProps {
  onNavigate: (page: Page) => void;
}

const cards = [
  { last4: '4521', account: 'Maria Garcia', type: 'person', cardType: 'Virtual', status: 'active', spend: '$847' },
  { last4: '8834', account: 'TechCorp Inc', type: 'business', cardType: 'Virtual', status: 'active', spend: '$12.4K' },
  { last4: '2847', account: 'Carlos Martinez', type: 'person', cardType: 'Physical', status: 'frozen', spend: '$0' },
  { last4: '9182', account: 'Ana Silva', type: 'person', cardType: 'Virtual', status: 'active', spend: '$1.2K' },
];

export function CardsPage({ onNavigate }: CardsPageProps) {
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Cards</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage all issued cards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total" value="8,234" icon={CreditCard} />
        <StatCard label="Active" value="7,891" />
        <StatCard label="Frozen" value="127" />
        <StatCard label="MTD Spend" value="$847K" change="12%" changeType="increase" icon={TrendingUp} />
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
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">MTD Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {cards.map((card, i) => (
              <tr 
                key={i} 
                onClick={() => onNavigate('card-detail')}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="font-mono text-sm text-gray-900 dark:text-white">•••• {card.last4}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{card.account}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {card.type === 'person' ? '👤 Person' : '🏢 Business'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Badge variant="neutral" size="sm">{card.cardType}</Badge>
                </td>
                <td className="px-4 py-4">
                  <Badge 
                    variant={card.status === 'active' ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {card.status === 'active' ? 'Active' : '❄️ Frozen'}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{card.spend}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}