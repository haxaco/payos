'use client';

import {
    CheckCircle2,
    Clock,
    Package,
    Truck,
    PackageCheck,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

// Safe date formatting helper
function safeFormatDate(dateStr: string | undefined | null, formatStr: string): string {
    if (!dateStr) return 'Unknown';
    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        if (!isValid(date)) return 'Invalid date';
        return format(date, formatStr);
    } catch {
        return 'Invalid date';
    }
}

export interface FulfillmentEvent {
    id?: string;
    type: 'created' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'exception' | 'cancelled';
    description: string;
    timestamp: string;
    tracking_url?: string;
    tracking_number?: string;
    carrier?: string;
    metadata?: Record<string, unknown>;
}

const eventConfig: Record<FulfillmentEvent['type'], {
    icon: typeof CheckCircle2;
    bgColor: string;
    iconColor: string;
}> = {
    created: {
        icon: Clock,
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-600',
    },
    confirmed: {
        icon: CheckCircle2,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
    },
    processing: {
        icon: Package,
        bgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
    },
    shipped: {
        icon: Truck,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
    },
    out_for_delivery: {
        icon: Truck,
        bgColor: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
    },
    delivered: {
        icon: PackageCheck,
        bgColor: 'bg-green-100',
        iconColor: 'text-green-600',
    },
    exception: {
        icon: AlertCircle,
        bgColor: 'bg-red-100',
        iconColor: 'text-red-600',
    },
    cancelled: {
        icon: AlertCircle,
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-600',
    },
};

interface FulfillmentTimelineProps {
    events: FulfillmentEvent[];
}

export function FulfillmentTimeline({ events }: FulfillmentTimelineProps) {
    if (!events || events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-sm">No fulfillment events yet</span>
            </div>
        );
    }

    // Sort events by timestamp (newest first for display)
    const sortedEvents = [...events].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-muted" />

            <div className="space-y-4">
                {sortedEvents.map((event, index) => {
                    const config = eventConfig[event.type] || eventConfig.created;
                    const Icon = config.icon;

                    return (
                        <div key={event.id || index} className="flex gap-4 relative">
                            {/* Icon */}
                            <div className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center shrink-0 z-10`}>
                                <Icon className={`h-4 w-4 ${config.iconColor}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-medium text-sm capitalize">
                                            {event.type.replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {event.description}
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                        {safeFormatDate(event.timestamp, 'MMM d, HH:mm')}
                                    </div>
                                </div>

                                {/* Tracking link */}
                                {(event.tracking_url || event.tracking_number) && (
                                    <div className="mt-2">
                                        {event.tracking_url ? (
                                            <a
                                                href={event.tracking_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                                Track shipment
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : event.tracking_number ? (
                                            <span className="text-xs text-muted-foreground">
                                                Tracking: {event.tracking_number}
                                            </span>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
