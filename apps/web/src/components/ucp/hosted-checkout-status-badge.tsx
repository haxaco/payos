'use client';

import { Badge } from '@payos/ui';
import {
    Clock,
    AlertTriangle,
    CheckCircle,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

export type HostedCheckoutStatus =
    | 'incomplete'
    | 'requires_escalation'
    | 'ready_for_complete'
    | 'complete_in_progress'
    | 'completed'
    | 'canceled';

const statusConfig: Record<HostedCheckoutStatus, {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
    className: string;
}> = {
    incomplete: {
        label: 'Incomplete',
        variant: 'secondary',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    requires_escalation: {
        label: 'Requires Escalation',
        variant: 'secondary',
        icon: AlertTriangle,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    ready_for_complete: {
        label: 'Ready to Complete',
        variant: 'default',
        icon: CheckCircle,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    complete_in_progress: {
        label: 'Completing...',
        variant: 'default',
        icon: Loader2,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    completed: {
        label: 'Completed',
        variant: 'default',
        icon: CheckCircle2,
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    canceled: {
        label: 'Canceled',
        variant: 'secondary',
        icon: XCircle,
        className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
};

interface HostedCheckoutStatusBadgeProps {
    status: HostedCheckoutStatus;
    showIcon?: boolean;
}

export function HostedCheckoutStatusBadge({ status, showIcon = true }: HostedCheckoutStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.incomplete;
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className={`${config.className} font-medium`}>
            {showIcon && (
                <Icon className={`h-3 w-3 mr-1 ${status === 'complete_in_progress' ? 'animate-spin' : ''}`} />
            )}
            {config.label}
        </Badge>
    );
}
