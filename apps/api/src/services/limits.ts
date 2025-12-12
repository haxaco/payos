import type { SupabaseClient } from '@supabase/supabase-js';
import { LimitExceededError } from '../middleware/error.js';

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  limitType?: string;
  limit?: number;
  used?: number;
  requested?: number;
}

export interface AgentLimits {
  perTransaction: number;
  daily: number;
  monthly: number;
}

export interface StreamLimits {
  maxActiveStreams: number;
  maxFlowRatePerStream: number;
  maxTotalOutflow: number;
}

export class LimitService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get agent with limits
   */
  private async getAgent(agentId: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select(`
        id, name, status, kya_tier,
        effective_limit_per_tx, effective_limit_daily, effective_limit_monthly,
        max_active_streams, max_flow_rate_per_stream, max_total_outflow,
        active_streams_count, total_stream_outflow
      `)
      .eq('id', agentId)
      .single();

    if (error || !data) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return data;
  }

  /**
   * Get agent's daily usage
   */
  private async getDailyUsage(agentId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await this.supabase
      .from('agent_usage')
      .select('daily_amount')
      .eq('agent_id', agentId)
      .eq('date', today)
      .single();

    return parseFloat(data?.daily_amount) || 0;
  }

  /**
   * Get agent's monthly usage
   */
  private async getMonthlyUsage(agentId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    const { data } = await this.supabase
      .from('agent_usage')
      .select('daily_amount')
      .eq('agent_id', agentId)
      .gte('date', startOfMonth);

    const total = (data || []).reduce((sum, row) => sum + (parseFloat(row.daily_amount) || 0), 0);
    return total;
  }

  /**
   * Check if a transaction amount is within agent limits
   */
  async checkTransactionLimit(
    agentId: string,
    amount: number
  ): Promise<LimitCheckResult> {
    const agent = await this.getAgent(agentId);

    // Check agent is active
    if (agent.status !== 'active') {
      return {
        allowed: false,
        reason: 'agent_not_active',
        limitType: 'status',
      };
    }

    const effectiveLimits: AgentLimits = {
      perTransaction: parseFloat(agent.effective_limit_per_tx) || 0,
      daily: parseFloat(agent.effective_limit_daily) || 0,
      monthly: parseFloat(agent.effective_limit_monthly) || 0,
    };

    // Check KYA tier (tier 0 cannot transact)
    if (agent.kya_tier === 0) {
      return {
        allowed: false,
        reason: 'kya_verification_required',
        limitType: 'kya_tier',
      };
    }

    // Per-transaction check
    if (amount > effectiveLimits.perTransaction) {
      return {
        allowed: false,
        reason: 'exceeds_per_transaction',
        limitType: 'per_transaction',
        limit: effectiveLimits.perTransaction,
        requested: amount,
      };
    }

    // Daily usage check
    const dailyUsage = await this.getDailyUsage(agentId);
    if (dailyUsage + amount > effectiveLimits.daily) {
      return {
        allowed: false,
        reason: 'exceeds_daily',
        limitType: 'daily',
        limit: effectiveLimits.daily,
        used: dailyUsage,
        requested: amount,
      };
    }

    // Monthly usage check
    const monthlyUsage = await this.getMonthlyUsage(agentId);
    if (monthlyUsage + amount > effectiveLimits.monthly) {
      return {
        allowed: false,
        reason: 'exceeds_monthly',
        limitType: 'monthly',
        limit: effectiveLimits.monthly,
        used: monthlyUsage,
        requested: amount,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if agent can create a new stream
   */
  async checkStreamLimit(
    agentId: string,
    flowRatePerMonth: number
  ): Promise<LimitCheckResult> {
    const agent = await this.getAgent(agentId);

    // Check agent is active
    if (agent.status !== 'active') {
      return {
        allowed: false,
        reason: 'agent_not_active',
        limitType: 'status',
      };
    }

    // Check KYA tier
    if (agent.kya_tier === 0) {
      return {
        allowed: false,
        reason: 'kya_verification_required',
        limitType: 'kya_tier',
      };
    }

    const streamLimits: StreamLimits = {
      maxActiveStreams: agent.max_active_streams || 5,
      maxFlowRatePerStream: parseFloat(agent.max_flow_rate_per_stream) || 5000,
      maxTotalOutflow: parseFloat(agent.max_total_outflow) || 50000,
    };

    // Stream count check
    const currentStreams = agent.active_streams_count || 0;
    if (currentStreams >= streamLimits.maxActiveStreams) {
      return {
        allowed: false,
        reason: 'max_streams_reached',
        limitType: 'stream_count',
        limit: streamLimits.maxActiveStreams,
        used: currentStreams,
      };
    }

    // Per-stream flow rate check
    if (flowRatePerMonth > streamLimits.maxFlowRatePerStream) {
      return {
        allowed: false,
        reason: 'exceeds_max_flow_rate',
        limitType: 'flow_rate',
        limit: streamLimits.maxFlowRatePerStream,
        requested: flowRatePerMonth,
      };
    }

    // Total outflow check
    const currentOutflow = parseFloat(agent.total_stream_outflow) || 0;
    const newTotalOutflow = currentOutflow + flowRatePerMonth;
    if (newTotalOutflow > streamLimits.maxTotalOutflow) {
      return {
        allowed: false,
        reason: 'exceeds_total_outflow',
        limitType: 'total_outflow',
        limit: streamLimits.maxTotalOutflow,
        used: currentOutflow,
        requested: flowRatePerMonth,
      };
    }

    return { allowed: true };
  }

  /**
   * Record usage for an agent (after successful transaction)
   */
  async recordUsage(agentId: string, amount: number): Promise<void> {
    const { error } = await this.supabase.rpc('record_agent_usage', {
      p_agent_id: agentId,
      p_amount: amount,
    });

    if (error) {
      console.error('Failed to record agent usage:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Update agent stream stats
   */
  async updateAgentStreamStats(
    agentId: string,
    streamCountDelta: number,
    outflowDelta: number
  ): Promise<void> {
    const { error } = await this.supabase.rpc('update_agent_stream_stats', {
      p_agent_id: agentId,
      p_stream_count_delta: streamCountDelta,
      p_outflow_delta: outflowDelta,
    });

    if (error) {
      // Fallback to direct update
      const agent = await this.getAgent(agentId);
      await this.supabase
        .from('agents')
        .update({
          active_streams_count: Math.max(0, (agent.active_streams_count || 0) + streamCountDelta),
          total_stream_outflow: Math.max(0, parseFloat(agent.total_stream_outflow || '0') + outflowDelta),
        })
        .eq('id', agentId);
    }
  }

  /**
   * Get agent's current usage stats
   */
  async getUsageStats(agentId: string) {
    const agent = await this.getAgent(agentId);
    const dailyUsage = await this.getDailyUsage(agentId);
    const monthlyUsage = await this.getMonthlyUsage(agentId);

    return {
      agentId,
      kyaTier: agent.kya_tier,
      status: agent.status,
      limits: {
        perTransaction: parseFloat(agent.effective_limit_per_tx) || 0,
        daily: parseFloat(agent.effective_limit_daily) || 0,
        monthly: parseFloat(agent.effective_limit_monthly) || 0,
      },
      usage: {
        daily: dailyUsage,
        monthly: monthlyUsage,
        dailyRemaining: Math.max(0, (parseFloat(agent.effective_limit_daily) || 0) - dailyUsage),
        monthlyRemaining: Math.max(0, (parseFloat(agent.effective_limit_monthly) || 0) - monthlyUsage),
      },
      streams: {
        active: agent.active_streams_count || 0,
        maxActive: agent.max_active_streams || 5,
        totalOutflow: parseFloat(agent.total_stream_outflow) || 0,
        maxTotalOutflow: parseFloat(agent.max_total_outflow) || 50000,
      },
    };
  }
}

/**
 * Create a limit service instance
 */
export function createLimitService(supabase: SupabaseClient): LimitService {
  return new LimitService(supabase);
}

