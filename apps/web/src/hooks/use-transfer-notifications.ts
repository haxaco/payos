import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Transfer } from '@sly/api-client';

export function useTransferNotifications(transfers: Transfer[] = []) {
    const previousStatuses = useRef<Record<string, string>>({});
    const initialized = useRef(false);

    useEffect(() => {
        // Skip notification on first load
        if (!initialized.current) {
            transfers.forEach(t => {
                previousStatuses.current[t.id] = t.status;
            });
            initialized.current = true;
            return;
        }

        // Check for status changes
        transfers.forEach(transfer => {
            const prevStatus = previousStatuses.current[transfer.id];
            const currentStatus = transfer.status;

            if (prevStatus && prevStatus !== currentStatus) {
                // Status changed!
                if (currentStatus === 'completed') {
                    toast.success(`Transfer to ${transfer.to?.accountName || 'Recipient'} completed`, {
                        description: `${transfer.currency} ${transfer.amount.toLocaleString()}`,
                        duration: 5000,
                    });
                } else if (currentStatus === 'failed') {
                    toast.error(`Transfer failed`, {
                        description: `Transfer to ${transfer.to?.accountName} could not be processed`,
                        duration: 5000,
                    });
                }

                // Update ref
                previousStatuses.current[transfer.id] = currentStatus;
            }
        });

        // Add new transfers to tracking
        transfers.forEach(t => {
            if (!previousStatuses.current[t.id]) {
                previousStatuses.current[t.id] = t.status;
            }
        });
    }, [transfers]);
}
