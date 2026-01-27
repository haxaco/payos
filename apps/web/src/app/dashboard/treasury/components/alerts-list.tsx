'use client';

import { TreasuryAlert } from '@sly/api-client';
import { Card, Button, Badge } from '@sly/ui';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface AlertsListProps {
    alerts: TreasuryAlert[];
    isLoading: boolean;
    onAcknowledge: (id: string) => Promise<void>;
    onResolve: (id: string) => Promise<void>;
}

export function AlertsList({ alerts, isLoading, onAcknowledge, onResolve }: AlertsListProps) {
    const [processing, setProcessing] = useState<string | null>(null);

    const handleAction = async (id: string, action: 'ack' | 'resolve') => {
        try {
            setProcessing(id);
            if (action === 'ack') {
                await onAcknowledge(id);
                toast.success('Alert acknowledged');
            } else {
                await onResolve(id);
                toast.success('Alert resolved');
            }
        } catch (error) {
            toast.error('Failed to update alert');
        } finally {
            setProcessing(null);
        }
    };

    if (isLoading) {
        return <Card className="p-6"><p className="text-center text-gray-500">Loading alerts...</p></Card>;
    }

    if (alerts.length === 0) {
        return (
            <Card className="p-8 text-center bg-gray-50 dark:bg-gray-900 border-dashed">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">No Active Alerts</h3>
                <p className="text-xs text-gray-500 mt-1">All systems operating within normal parameters.</p>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Active Alerts
                    <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-[10px]">{alerts.length}</Badge>
                </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {alerts.map(alert => (
                    <div key={alert.id} className="p-4 flex items-start justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 transition">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'warning' : 'secondary'} className="uppercase text-[10px] h-5">
                                    {alert.severity}
                                </Badge>
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{alert.title}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{alert.message}</p>
                            <p className="text-[10px] text-gray-400 font-mono pt-1">{alert.id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Acknowledge"
                                disabled={!!processing}
                                onClick={() => handleAction(alert.id, 'ack')}
                            >
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                title="Resolve"
                                disabled={!!processing}
                                onClick={() => handleAction(alert.id, 'resolve')}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
