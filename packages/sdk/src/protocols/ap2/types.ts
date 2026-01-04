/**
 * Types for AP2 (Agent-to-Agent Protocol) - Google
 */

export type MandateType = 'intent' | 'cart' | 'payment';
export type MandateStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface Mandate {
  id: string;
  mandate_id: string;
  mandate_type: MandateType;
  agent_id: string;
  agent_name?: string;
  account_id: string;
  authorized_amount: number;
  used_amount: number;
  remaining_amount: number;
  currency: string;
  status: MandateStatus;
  execution_count: number;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface MandateWithExecutions extends Mandate {
  mandate_data?: Record<string, any>;
  a2a_session_id?: string;
  metadata?: Record<string, any>;
  executions: MandateExecution[];
}

export interface MandateExecution {
  id: string;
  execution_index: number;
  amount: number;
  currency: string;
  status: string;
  transfer_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface CreateMandateRequest {
  mandate_id: string;
  mandate_type: MandateType;
  agent_id: string;
  agent_name?: string;
  account_id: string;
  authorized_amount: number;
  currency?: string;
  mandate_data?: Record<string, any>;
  a2a_session_id?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
}

export interface ExecuteMandateRequest {
  amount: number;
  currency?: string;
  authorization_proof?: string;
  description?: string;
  idempotency_key?: string;
}

export interface ExecuteMandateResponse {
  execution_id: string;
  transfer_id: string;
  mandate: {
    id: string;
    remaining_amount: number;
    used_amount: number;
    execution_count: number;
    status: MandateStatus;
  };
  transfer: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
  };
}

export interface ListMandatesOptions {
  status?: MandateStatus;
  agent_id?: string;
  account_id?: string;
  page?: number;
  limit?: number;
}

export interface ListMandatesResponse {
  data: Mandate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

