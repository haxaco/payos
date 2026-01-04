export interface AccountContext {
    // Core account details
    account: {
        id: string;
        name: string;
        email: string;
        type: 'person' | 'business';
        status: 'active' | 'suspended' | 'closed';
        verification_tier: number;
        verification_status: string;
        created_at: string;
        updated_at: string;
        metadata?: Record<string, unknown>;
    };

    // Financial state
    balances: {
        currencies: Array<{
            currency: string;
            available: string;
            pending_incoming: string;
            pending_outgoing: string;
            holds: string;
            total: string;
        }>;
        usd_equivalent: {
            available: string;
            total: string;
        };
    };

    // Activity summary (last 30 days)
    activity: {
        period_days: number;
        transfers: {
            count: number;
            volume_usd: string;
            average_size_usd: string;
            success_rate: number;
        };
        recent_transfers: Array<{
            id: string;
            status: string;
            amount: string;
            currency: string;
            direction: 'incoming' | 'outgoing';
            created_at: string;
        }>;
    };

    // Agents
    agents: Array<{
        id: string;
        name: string;
        status: string;
        kya_tier: number;
        created_at: string;
    }>;

    // Limits and usage
    limits: {
        daily: {
            limit: number;
            used: number;
            remaining: number;
            resets_at: string;
        };
        monthly: {
            limit: number;
            used: number;
            remaining: number;
            resets_at: string;
        };
    };

    // Compliance and risk
    compliance: {
        kyb_status: string;
        kyb_tier: number;
        risk_level: 'low' | 'medium' | 'high';
        flags: string[];
    };

    // Next actions
    suggested_actions: Array<{
        action: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
    }>;
}

export type ContextResponse<T> = {
    data: T;
    meta?: {
        request_id?: string;
        timestamp?: string;
        processing_time_ms?: number;
    };
};
