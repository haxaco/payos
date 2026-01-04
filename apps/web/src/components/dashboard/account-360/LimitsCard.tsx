import { AccountContext } from '@/types/context';

interface LimitsCardProps {
    limits: AccountContext['limits'];
}

export function LimitsCard({ limits }: LimitsCardProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const calculatePercent = (used: number, limit: number) => {
        if (limit === 0) return 0;
        return Math.min(100, Math.max(0, (used / limit) * 100));
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 90) return 'bg-red-500';
        if (percent >= 75) return 'bg-yellow-500';
        return 'bg-blue-600';
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Spending Limits</h3>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Limit</span>
                            <div className="text-xs text-gray-500">Resets {new Date(limits.daily.resets_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatCurrency(limits.daily.used)} <span className="text-gray-400 font-normal">/ {formatCurrency(limits.daily.limit)}</span>
                            </div>
                            <div className="text-xs text-gray-500">{formatCurrency(limits.daily.remaining)} remaining</div>
                        </div>
                    </div>

                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(calculatePercent(limits.daily.used, limits.daily.limit))}`}
                            style={{ width: `${calculatePercent(limits.daily.used, limits.daily.limit)}%` }}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Limit</span>
                            <div className="text-xs text-gray-500">Resets {new Date(limits.monthly.resets_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatCurrency(limits.monthly.used)} <span className="text-gray-400 font-normal">/ {formatCurrency(limits.monthly.limit)}</span>
                            </div>
                            <div className="text-xs text-gray-500">{formatCurrency(limits.monthly.remaining)} remaining</div>
                        </div>
                    </div>

                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(calculatePercent(limits.monthly.used, limits.monthly.limit))}`}
                            style={{ width: `${calculatePercent(limits.monthly.used, limits.monthly.limit)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
