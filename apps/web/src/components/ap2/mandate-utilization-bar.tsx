import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface MandateUtilizationBarProps {
    authorized: number;
    used: number;
    currency: string;
    className?: string;
}

export function MandateUtilizationBar({
    authorized,
    used,
    currency,
    className,
}: MandateUtilizationBarProps) {
    const percentage = Math.min(100, Math.max(0, (used / authorized) * 100));
    const remaining = Math.max(0, authorized - used);

    const isHighUtilization = percentage > 80;
    const isFull = percentage >= 100;

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium">
                    {percentage.toFixed(1)}%
                </span>
            </div>

            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isFull ? "bg-destructive" : isHighUtilization ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used: {formatCurrency(used, currency)}</span>
                <span>Limit: {formatCurrency(authorized, currency)}</span>
            </div>
        </div>
    );
}
