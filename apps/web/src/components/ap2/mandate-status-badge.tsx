import { Badge } from "@payos/ui";
import { MandateStatus } from "@payos/api-client";
import { cn } from "@/lib/utils";

interface MandateStatusBadgeProps {
    status: MandateStatus;
    className?: string;
}

const statusConfig: Record<MandateStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
    active: { label: "Active", variant: "outline", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-transparent" },
    completed: { label: "Completed", variant: "secondary" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    expired: { label: "Expired", variant: "outline", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 border-transparent" },
};

export function MandateStatusBadge({ status, className }: MandateStatusBadgeProps) {
    const config = statusConfig[status] || { label: status, variant: "secondary" };

    return (
        <Badge variant={config.variant} className={cn("capitalize", config.className, className)}>
            {config.label}
        </Badge>
    );
}
