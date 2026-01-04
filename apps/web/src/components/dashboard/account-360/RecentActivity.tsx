import { AccountContext } from '@/types/context';
import { ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface RecentActivityProps {
    activity: AccountContext['activity'];
    accountId: string;
}

export function RecentActivity({ activity, accountId }: RecentActivityProps) {
    const formatCurrency = (amount: string, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(parseFloat(amount));
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                <Link
                    href={`/dashboard/transfers?account_id=${accountId}`}
                    className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                    View All <ExternalLink className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Volume (30d)</span>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(activity.transfers.volume_usd, 'USD')}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Transfers</span>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {activity.transfers.count}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Success Rate</span>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {activity.transfers.success_rate.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last 5 Transfers</h4>
                {activity.recent_transfers.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No recent transfers.</p>
                ) : (
                    <div className="space-y-2">
                        {activity.recent_transfers.map((transfer) => (
                            <div key={transfer.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transfer.direction === 'incoming'
                                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
                                        }`}>
                                        {transfer.direction === 'incoming' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {transfer.direction === 'incoming' ? 'Received' : 'Sent'} {transfer.currency}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(transfer.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-sm font-bold ${transfer.direction === 'incoming' ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'
                                        }`}>
                                        {transfer.direction === 'incoming' ? '+' : '-'}{formatCurrency(transfer.amount, transfer.currency)}
                                    </div>
                                    <div className="text-xs text-gray-400 capitalize">{transfer.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
