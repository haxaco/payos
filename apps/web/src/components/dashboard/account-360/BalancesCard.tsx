import { AccountContext } from '@/types/context';

interface BalancesCardProps {
    balances: AccountContext['balances'];
}

export function BalancesCard({ balances }: BalancesCardProps) {
    const formatCurrency = (amount: string, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(parseFloat(amount));
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Balances</h3>
                <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total USD Equivalent</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(balances.usd_equivalent.total, 'USD')}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {balances.currencies.map((balance) => (
                    <div key={balance.currency} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                    {balance.currency}
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{balance.currency}</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(balance.available, balance.currency)}
                            </span>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                            <div className="flex gap-4">
                                {parseFloat(balance.pending_incoming) > 0 && (
                                    <span className="text-green-600 dark:text-green-400">
                                        +{formatCurrency(balance.pending_incoming, balance.currency)} incoming
                                    </span>
                                )}
                                {parseFloat(balance.pending_outgoing) > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400">
                                        -{formatCurrency(balance.pending_outgoing, balance.currency)} outgoing
                                    </span>
                                )}
                            </div>
                            {parseFloat(balance.holds) > 0 && (
                                <span>{formatCurrency(balance.holds, balance.currency)} on hold</span>
                            )}
                        </div>
                    </div>
                ))}

                {balances.currencies.length === 0 && (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No balances found.
                    </div>
                )}
            </div>
        </div>
    );
}
