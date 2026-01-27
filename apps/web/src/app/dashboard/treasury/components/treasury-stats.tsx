'use client';

import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Card, Skeleton } from '@sly/ui';
import { DashboardSummary } from '@sly/api-client';

interface TreasuryStatsProps {
    stats?: DashboardSummary;
    isLoading: boolean;
}

// Format currency with compact notation (e.g., $1.2M, $500K)
// Uses a deterministic format to avoid hydration mismatches
function formatCompactCurrency(amount: number): string {
    if (amount === 0) return '$0';
    
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    
    if (absAmount >= 1_000_000_000) {
        return `${sign}$${(absAmount / 1_000_000_000).toFixed(1)}B`;
    }
    if (absAmount >= 1_000_000) {
        return `${sign}$${(absAmount / 1_000_000).toFixed(1)}M`;
    }
    if (absAmount >= 1_000) {
        return `${sign}$${(absAmount / 1_000).toFixed(1)}K`;
    }
    return `${sign}$${absAmount.toFixed(0)}`;
}

export function TreasuryStats({ stats, isLoading }: TreasuryStatsProps) {
    // Use client-side only rendering for formatted values to avoid hydration mismatch
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    if (isLoading || !mounted) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>
        );
    }

    // Use primary field names with fallbacks for compatibility
    const totalFloat = stats?.totalFloat ?? stats?.totalBalance ?? 0;
    const inflows = stats?.inflows24h ?? 0;
    const outflows = stats?.outflows24h ?? 0;
    const alerts = stats?.openAlerts ?? stats?.alertsCount ?? 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 bg-white dark:bg-gray-950">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCompactCurrency(totalFloat)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Float</div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-950">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">24h</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCompactCurrency(inflows)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Inflows</div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-950">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">24h</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCompactCurrency(outflows)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Outflows</div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-950">
                <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {alerts}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</div>
            </Card>
        </div>
    );
}
