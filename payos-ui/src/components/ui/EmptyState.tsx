import { Users, ArrowLeftRight, CreditCard, Shield, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'accounts' | 'transactions' | 'cards' | 'compliance' | 'search';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const configs = {
  accounts: {
    icon: Users,
    title: 'No accounts yet',
    description: 'Create your first account to start accepting payouts.',
    actionLabel: 'Add Account'
  },
  transactions: {
    icon: ArrowLeftRight,
    title: 'No transactions yet',
    description: 'Transactions will appear here once accounts start sending and receiving funds.',
    actionLabel: 'Create Payout'
  },
  cards: {
    icon: CreditCard,
    title: 'No cards issued',
    description: 'Issue virtual or physical cards to your accounts.',
    actionLabel: 'Issue Card'
  },
  compliance: {
    icon: Shield,
    title: 'All clear!',
    description: 'No compliance flags require your attention. Great job!',
    actionLabel: undefined
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
    actionLabel: 'Clear Filters'
  }
};

export function EmptyState({ type, title, description, actionLabel, onAction }: EmptyStateProps) {
  const config = configs[type];
  const Icon = config.icon;
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title || config.title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
        {description || config.description}
      </p>
      {(actionLabel || config.actionLabel) && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {actionLabel || config.actionLabel}
        </button>
      )}
    </div>
  );
}
