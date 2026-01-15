'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

type EventType = 'transfer.updated' | 'account.updated' | 'compliance.flagged';

interface RealtimeEvent {
    type: EventType;
    payload: any;
    timestamp: number;
}

interface RealtimeContextType {
    lastEvent: RealtimeEvent | null;
    isConnected: boolean;
    subscribe: (event: EventType, callback: (payload: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
    const subscribersRef = React.useRef<Map<EventType, Set<(payload: any) => void>>>(new Map());

    // Simulate connection
    useEffect(() => {
        // In a real app, this would connect to Supabase Realtime or a WebSocket
        const timer = setTimeout(() => setIsConnected(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const subscribe = (event: EventType, callback: (payload: any) => void) => {
        if (!subscribersRef.current.has(event)) {
            subscribersRef.current.set(event, new Set());
        }
        subscribersRef.current.get(event)?.add(callback);

        // Return cleanup function
        return () => {
            subscribersRef.current.get(event)?.delete(callback);
        };
    };

    // Helper to dispatch events (would come from WS in reality)
    const dispatchEvent = (type: EventType, payload: any) => {
        const event = { type, payload, timestamp: Date.now() };
        setLastEvent(event);

        // Notify subscribers
        subscribersRef.current.get(type)?.forEach(cb => cb(payload));
    };

    return (
        <RealtimeContext.Provider value={{ isConnected, lastEvent, subscribe }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export const useRealtime = () => {
    const context = useContext(RealtimeContext);
    if (context === undefined) {
        throw new Error('useRealtime must be used within a RealtimeProvider');
    }
    return context;
};
