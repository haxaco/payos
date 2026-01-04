'use client';

import { TreasuryAccount } from '@payos/api-client';
import { Skeleton, Badge } from '@payos/ui';
import { ArrowRight } from 'lucide-react';
import { formatCurrencyStandalone } from '@/lib/locale';

interface AccountsTableProps {
    accounts: TreasuryAccount[];
    isLoading: boolean;
}

export function AccountsTable({ accounts, isLoading }: AccountsTableProps) {
    if (isLoading) {
        return <Skeleton className="h-64 w-full rounded-xl" />;
    }

    const getUtilizationColor = (utilization: number) => {
        if (utilization >= 90) return 'bg-red-500';
        if (utilization >= 75) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const calculateUtilization = (account: TreasuryAccount) => {
        if (!account.maxBalance || account.maxBalance === 0) return 0;
        return Math.min(100, Math.round((account.balanceTotal / account.maxBalance) * 100));
    };

    return (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Treasury Accounts</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rail / Account</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Currency</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Utilization</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {accounts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No treasury accounts connected.
                                </td>
                            </tr>
                        ) : (
                            accounts.map((account) => {
                                const utilization = calculateUtilization(account);
                                return (
                                    <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900 dark:text-white capitalize">{account.rail.replace('_', ' ')}</span>
                                                <span className="text-xs text-gray-500">{account.accountName || account.externalAccountId || account.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {formatCurrencyStandalone(account.balanceTotal, account.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {account.currency}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden w-24">
                                                    <div
                                                        className={`h-full rounded-full ${getUtilizationColor(utilization)}`}
                                                        style={{ width: `${utilization}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500">{utilization}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={account.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                {account.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
