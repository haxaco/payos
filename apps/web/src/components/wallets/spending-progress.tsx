'use client';

import { cn, formatCurrency } from "@/lib/utils";

interface SpendingProgressProps {
    label: string;
    spent: number;
    limit?: number;
    currency?: string;
    resetAt?: string;
    className?: string;
    showReset?: boolean;
}

/**
 * Spending progress bar with color thresholds
 * - Green (<80%): Normal spending
 * - Amber (80-95%): Near limit warning
 * - Red (>95%): Critical/At limit
 */
export function SpendingProgress({
    label,
    spent,
    limit,
    currency = 'USD',
    resetAt,
    className,
    showReset = false,
}: SpendingProgressProps) {
    // If no limit is set, show "No limit configured"
    if (!limit) {
        return (
            <div className={cn("space-y-2", className)}>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-muted-foreground text-xs italic">No limit set</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full w-0 rounded-full" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Spent: {formatCurrency(spent, currency)}</span>
                    <span>Unlimited</span>
                </div>
            </div>
        );
    }

    const percentage = Math.min(100, Math.max(0, (spent / limit) * 100));
    const remaining = Math.max(0, limit - spent);

    // Color thresholds
    const isNearLimit = percentage >= 80;
    const isCritical = percentage >= 95;

    // Format reset time if provided
    const formatResetTime = (isoDate?: string) => {
        if (!isoDate) return null;
        try {
            const date = new Date(isoDate);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        } catch {
            return null;
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={cn(
                    "font-medium",
                    isCritical ? "text-red-600 dark:text-red-400" :
                    isNearLimit ? "text-amber-600 dark:text-amber-400" :
                    "text-foreground"
                )}>
                    {formatCurrency(spent, currency)} / {formatCurrency(limit, currency)}
                </span>
            </div>

            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCritical ? "bg-red-500" :
                        isNearLimit ? "bg-amber-500" :
                        "bg-primary"
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
                <span className={cn(
                    isNearLimit && "font-medium",
                    isCritical ? "text-red-600 dark:text-red-400" :
                    isNearLimit ? "text-amber-600 dark:text-amber-400" : ""
                )}>
                    {percentage.toFixed(0)}% used
                </span>
                <span>
                    {remaining > 0
                        ? `${formatCurrency(remaining, currency)} remaining`
                        : 'Limit reached'
                    }
                </span>
            </div>

            {showReset && resetAt && (
                <div className="text-xs text-muted-foreground">
                    Resets: {formatResetTime(resetAt)}
                </div>
            )}
        </div>
    );
}

interface SpendingProgressCompactProps {
    spent: number;
    limit?: number;
    currency?: string;
    className?: string;
}

/**
 * Compact version of spending progress - just the bar with minimal info
 */
export function SpendingProgressCompact({
    spent,
    limit,
    currency = 'USD',
    className,
}: SpendingProgressCompactProps) {
    if (!limit) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full w-0 rounded-full" />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatCurrency(spent, currency)}
                </span>
            </div>
        );
    }

    const percentage = Math.min(100, Math.max(0, (spent / limit) * 100));
    const isNearLimit = percentage >= 80;
    const isCritical = percentage >= 95;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isCritical ? "bg-red-500" :
                        isNearLimit ? "bg-amber-500" :
                        "bg-primary"
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className={cn(
                "text-xs whitespace-nowrap",
                isCritical ? "text-red-600 dark:text-red-400" :
                isNearLimit ? "text-amber-600 dark:text-amber-400" :
                "text-muted-foreground"
            )}>
                {formatCurrency(spent, currency)} / {formatCurrency(limit, currency)}
            </span>
        </div>
    );
}
