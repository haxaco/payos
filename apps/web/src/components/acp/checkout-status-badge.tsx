import { Badge } from "@payos/ui";

type CheckoutStatus = 'pending' | 'completed' | 'cancelled' | 'expired' | 'failed';

interface CheckoutStatusBadgeProps {
    status: CheckoutStatus;
    className?: string;
}

const statusConfig: Record<CheckoutStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string; label: string }> = {
    pending: {
        variant: "secondary",
        label: "Pending",
        className: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20",
    },
    completed: {
        variant: "outline",
        label: "Completed",
        className: "text-green-500 border-green-500/50 bg-green-500/10",
    },
    cancelled: {
        variant: "secondary",
        label: "Cancelled",
        className: "text-muted-foreground",
    },
    expired: {
        variant: "destructive",
        label: "Expired",
    },
    failed: {
        variant: "destructive",
        label: "Failed",
    },
};

export function CheckoutStatusBadge({ status, className }: CheckoutStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;

    return (
        <Badge
            variant={config.variant}
            className={`${config.className || ''} ${className || ''}`}
        >
            {config.label}
        </Badge>
    );
}
