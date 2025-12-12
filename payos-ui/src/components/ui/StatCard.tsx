import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  icon?: LucideIcon;
  onClick?: () => void;
}

export function StatCard({ label, value, change, changeType, icon: Icon, onClick }: StatCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5
        ${onClick ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        )}
        {change && (
          <span className={`
            flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full
            ${changeType === 'increase' 
              ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
            }
          `}>
            {changeType === 'increase' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {change}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </Component>
  );
}
