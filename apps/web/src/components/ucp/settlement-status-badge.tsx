'use client';

import { Badge } from '@sly/ui';
import { CheckCircle2, XCircle, Clock, Loader2, ShieldAlert } from 'lucide-react';

type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'pending_approval';

const statusConfig: Record<SettlementStatus, {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof CheckCircle2;
    className: string;
}> = {
    pending: {
        label: 'Pending',
        variant: 'secondary',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    processing: {
        label: 'Processing',
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
    failed: {
        label: 'Failed',
        variant: 'destructive',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 border-red-200',
    },
    pending_approval: {
        label: 'Pending Approval',
        variant: 'secondary',
        icon: ShieldAlert,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
};

interface SettlementStatusBadgeProps {
    status: SettlementStatus;
    showIcon?: boolean;
}

export function SettlementStatusBadge({ status, showIcon = true }: SettlementStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className={`${config.className} font-medium`}>
            {showIcon && (
                <Icon className={`h-3 w-3 mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
            )}
            {config.label}
        </Badge>
    );
}
