import type { SupabaseClient } from '@supabase/supabase-js';
import { LimitExceededError } from '../middleware/error.js';
import { trackOp } from './ops/track-op.js';
import { OpType } from './ops/operation-types.js';

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

// Per-agent mutex to prevent concurrent limit-check race conditions.
// When two requests for the same agent arrive simultaneously, the second
// waits for the first to complete its limit check + transfer creation
// before reading usage, ensuring daily/monthly caps can't be bypassed.
const AGENT_LIMIT_LOCKS = new Map<string, Promise<void>>();

function withAgentLock<T>(agentId: string, fn: () => Promise<T>): Promise<T> {
  const prev = AGENT_LIMIT_LOCKS.get(agentId) || Promise.resolve();
  let resolve: () => void;
  const next = new Promise<void>(r => { resolve = r; });
  AGENT_LIMIT_LOCKS.set(agentId, next);

  return prev.then(fn).finally(() => {
    resolve!();
    // Cleanup lock entry if this is the latest promise
    if (AGENT_LIMIT_LOCKS.get(agentId) === next) {
      AGENT_LIMIT_LOCKS.delete(agentId);
    }
  });
}

export class LimitService {
  constructor(
    private supabase: SupabaseClient,
    private environment: 'test' | 'live' = 'test',
  ) {}

  /**
   * Get agent with limits and parent account info
   */
  private async getAgent(agentId: string) {
    // Get agent data
    const { data: agent, error: agentError } = await this.supabase
      .from('agents')
      .select(`
        id, name, status, kya_tier, parent_account_id, tenant_id,
        limit_per_transaction, limit_daily, limit_monthly,
        effective_limit_per_tx, effective_limit_daily, effective_limit_monthly,
        effective_limits_capped,
        max_active_streams, max_flow_rate_per_stream, max_total_outflow,
        active_streams_count, total_stream_outflow
      `)
      .eq('id', agentId)
      .eq('environment', this.environment)
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Get parent account if exists
    let parentAccount = null;
    if (agent.parent_account_id) {
      const { data: account, error: accountError } = await this.supabase
        .from('accounts')
        .select('id, name, verification_tier, verification_status')
        .eq('id', agent.parent_account_id)
        .eq('environment', this.environment)
        .single();
      
      if (accountError) {
        console.error('Failed to get parent account:', accountError);
      }
      parentAccount = account;
    }

    return { ...agent, parentAccount };
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
    amount: number,
    correlationId?: string
  ): Promise<LimitCheckResult> {
    // Serialize concurrent limit checks per agent to prevent race conditions
    // where parallel requests both read "under limit" before either writes usage
    return withAgentLock(agentId, () => this._checkTransactionLimitInner(agentId, amount, correlationId));
  }

  private async _checkTransactionLimitInner(
    agentId: string,
    amount: number,
    correlationId?: string
  ): Promise<LimitCheckResult> {
    const agent = await this.getAgent(agentId);

    // Check agent is active
    if (agent.status !== 'active') {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'agent_not_active',
        limitType: 'status',
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}`,
        correlationId,
        success: false,
        data: { amount, reason: result.reason, limitType: result.limitType },
      });
      return result;
    }

    let effectiveLimits: AgentLimits = {
      perTransaction: parseFloat(agent.effective_limit_per_tx) || 0,
      daily: parseFloat(agent.effective_limit_daily) || 0,
      monthly: parseFloat(agent.effective_limit_monthly) || 0,
    };

    // Rating-based limit reduction with rater reliability weighting.
    // Instead of a simple average, each rater's score is weighted by how
    // calibrated they are vs consensus. A rater who consistently deviates
    // >40 points from the mean gets their weight reduced (e.g., CodeSmith
    // rating everyone 8/100 when consensus is 75 gets reliability ~0.35).
    try {
      const { data: ratings } = await this.supabase
        .from('a2a_task_feedback')
        .select('score, caller_agent_id')
        .eq('provider_agent_id', agentId)
        .eq('revealed', true) // only count revealed ratings (double-blind)
        .limit(50);
      if (ratings && ratings.length >= 3) {
        // Compute rater reliability: for each rater, how far do their scores
        // deviate from the consensus score for the same providers?
        const raterIds = [...new Set(ratings.map((r: any) => r.caller_agent_id).filter(Boolean))];
        const raterReliability: Record<string, number> = {};

        if (raterIds.length >= 2) {
          // Get ALL ratings from these raters to compute their deviation
          const { data: allRaterScores } = await this.supabase
            .from('a2a_task_feedback')
            .select('caller_agent_id, provider_agent_id, score')
            .in('caller_agent_id', raterIds)
            .eq('revealed', true)
            .limit(200);

          if (allRaterScores && allRaterScores.length > 0) {
            // Group by provider to get consensus per provider
            const byProvider: Record<string, number[]> = {};
            allRaterScores.forEach((r: any) => {
              if (!byProvider[r.provider_agent_id]) byProvider[r.provider_agent_id] = [];
              byProvider[r.provider_agent_id].push(r.score || 0);
            });

            // For each rater, compute avg deviation from provider consensus
            for (const raterId of raterIds) {
              const raterScores = allRaterScores.filter((r: any) => r.caller_agent_id === raterId);
              let totalDev = 0, count = 0;
              for (const rs of raterScores) {
                const provScores = byProvider[rs.provider_agent_id] || [];
                if (provScores.length >= 2) {
                  const othersAvg = provScores.filter((_, i) => provScores[i] !== rs.score || i > 0)
                    .reduce((s, v) => s + v, 0) / Math.max(1, provScores.length - 1);
                  totalDev += Math.abs((rs.score || 0) - othersAvg);
                  count++;
                }
              }
              const avgDev = count > 0 ? totalDev / count : 0;
              // reliability: 1.0 = perfectly calibrated, 0.2 = minimum floor
              raterReliability[raterId] = Math.max(0.2, 1.0 - avgDev / 100);
            }
          }
        }

        // Weighted average: each rating's score × rater's reliability
        let weightedSum = 0, weightTotal = 0;
        for (const r of ratings) {
          const weight = raterReliability[r.caller_agent_id] || 1.0;
          weightedSum += (r.score || 0) * weight;
          weightTotal += weight;
        }
        const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;

        if (weightedAvg < 30) {
          effectiveLimits = {
            perTransaction: effectiveLimits.perTransaction * 0.5,
            daily: effectiveLimits.daily * 0.5,
            monthly: effectiveLimits.monthly * 0.5,
          };
          trackOp({
            tenantId: agent.tenant_id,
            operation: OpType.GOVERNANCE_LIMIT_CHECK,
            subject: `agent/${agentId}`,
            correlationId,
            success: true,
            data: { weightedAvg: Math.round(weightedAvg), ratingCount: ratings.length, raterCount: raterIds.length, limitReduction: '50%', reason: 'low_rating_penalty' },
          });
        }
      }
    } catch { /* rating check is best-effort — don't block transfers if feedback table unavailable */ }

    // Check KYA tier (tier 0 blocked only if no effective limits set)
    if (agent.kya_tier === 0 && effectiveLimits.perTransaction <= 0) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'kya_verification_required',
        limitType: 'kya_tier',
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}`,
        correlationId,
        success: false,
        data: { amount, reason: result.reason, limitType: result.limitType },
      });
      return result;
    }

    // Per-transaction check
    if (amount > effectiveLimits.perTransaction) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'exceeds_per_transaction',
        limitType: 'per_transaction',
        limit: effectiveLimits.perTransaction,
        requested: amount,
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}`,
        correlationId,
        success: false,
        data: { amount, reason: result.reason, limitType: result.limitType, limit: effectiveLimits.perTransaction },
      });
      return result;
    }

    // Daily usage check
    const dailyUsage = await this.getDailyUsage(agentId);
    if (dailyUsage + amount > effectiveLimits.daily) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'exceeds_daily',
        limitType: 'daily',
        limit: effectiveLimits.daily,
        used: dailyUsage,
        requested: amount,
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}`,
        correlationId,
        success: false,
        data: { amount, reason: result.reason, limitType: result.limitType, limit: effectiveLimits.daily, used: dailyUsage },
      });
      return result;
    }

    // Monthly usage check
    const monthlyUsage = await this.getMonthlyUsage(agentId);
    if (monthlyUsage + amount > effectiveLimits.monthly) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'exceeds_monthly',
        limitType: 'monthly',
        limit: effectiveLimits.monthly,
        used: monthlyUsage,
        requested: amount,
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}`,
        correlationId,
        success: false,
        data: { amount, reason: result.reason, limitType: result.limitType, limit: effectiveLimits.monthly, used: monthlyUsage },
      });
      return result;
    }

    trackOp({
      tenantId: agent.tenant_id,
      operation: OpType.GOVERNANCE_LIMIT_CHECK,
      subject: `agent/${agentId}`,
      correlationId,
      success: true,
      data: { amount },
    });
    return { allowed: true };
  }

  /**
   * Check if agent can create a new stream
   */
  async checkStreamLimit(
    agentId: string,
    flowRatePerMonth: number,
    correlationId?: string
  ): Promise<LimitCheckResult> {
    const agent = await this.getAgent(agentId);

    // Check agent is active
    if (agent.status !== 'active') {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'agent_not_active',
        limitType: 'status',
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}/stream`,
        correlationId,
        success: false,
        data: { flowRatePerMonth, reason: result.reason, limitType: result.limitType },
      });
      return result;
    }

    // Check KYA tier
    if (agent.kya_tier === 0) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'kya_verification_required',
        limitType: 'kya_tier',
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}/stream`,
        correlationId,
        success: false,
        data: { flowRatePerMonth, reason: result.reason, limitType: result.limitType },
      });
      return result;
    }

    const streamLimits: StreamLimits = {
      maxActiveStreams: agent.max_active_streams || 5,
      maxFlowRatePerStream: parseFloat(agent.max_flow_rate_per_stream) || 5000,
      maxTotalOutflow: parseFloat(agent.max_total_outflow) || 50000,
    };

    // Stream count check
    const currentStreams = agent.active_streams_count || 0;
    if (currentStreams >= streamLimits.maxActiveStreams) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'max_streams_reached',
        limitType: 'stream_count',
        limit: streamLimits.maxActiveStreams,
        used: currentStreams,
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}/stream`,
        correlationId,
        success: false,
        data: { flowRatePerMonth, reason: result.reason, limitType: result.limitType },
      });
      return result;
    }

    // Per-stream flow rate check
    if (flowRatePerMonth > streamLimits.maxFlowRatePerStream) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'exceeds_max_flow_rate',
        limitType: 'flow_rate',
        limit: streamLimits.maxFlowRatePerStream,
        requested: flowRatePerMonth,
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}/stream`,
        correlationId,
        success: false,
        data: { flowRatePerMonth, reason: result.reason, limitType: result.limitType },
      });
      return result;
    }

    // Total outflow check
    const currentOutflow = parseFloat(agent.total_stream_outflow) || 0;
    const newTotalOutflow = currentOutflow + flowRatePerMonth;
    if (newTotalOutflow > streamLimits.maxTotalOutflow) {
      const result: LimitCheckResult = {
        allowed: false,
        reason: 'exceeds_total_outflow',
        limitType: 'total_outflow',
        limit: streamLimits.maxTotalOutflow,
        used: currentOutflow,
        requested: flowRatePerMonth,
      };
      trackOp({
        tenantId: agent.tenant_id,
        operation: OpType.GOVERNANCE_LIMIT_CHECK,
        subject: `agent/${agentId}/stream`,
        correlationId,
        success: false,
        data: { flowRatePerMonth, reason: result.reason, limitType: result.limitType },
      });
      return result;
    }

    trackOp({
      tenantId: agent.tenant_id,
      operation: OpType.GOVERNANCE_LIMIT_CHECK,
      subject: `agent/${agentId}/stream`,
      correlationId,
      success: true,
      data: { flowRatePerMonth },
    });
    return { allowed: true };
  }

  /**
   * Record usage for an agent (after successful transaction).
   * Direct upsert into agent_usage table (unique on agent_id + date).
   */
  async recordUsage(agentId: string, amount: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Look up tenant_id from the agent record
    const { data: agent, error: agentError } = await this.supabase
      .from('agents')
      .select('tenant_id')
      .eq('id', agentId)
      .eq('environment', this.environment)
      .single();

    if (agentError || !agent) {
      console.error('Failed to find agent for usage recording:', agentError);
      return;
    }

    // Check if a row already exists for today
    const { data: existing } = await this.supabase
      .from('agent_usage')
      .select('id, daily_amount, transaction_count')
      .eq('agent_id', agentId)
      .eq('date', today)
      .single();

    if (existing) {
      const { error } = await this.supabase
        .from('agent_usage')
        .update({
          daily_amount: (parseFloat(existing.daily_amount) || 0) + amount,
          transaction_count: (existing.transaction_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Failed to update agent usage:', error);
      }
    } else {
      const { error } = await this.supabase
        .from('agent_usage')
        .insert({
          agent_id: agentId,
          tenant_id: agent.tenant_id,
          date: today,
          daily_amount: amount,
          transaction_count: 1,
        });

      if (error) {
        console.error('Failed to insert agent usage:', error);
      }
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
   * Get agent's current usage stats with effective limits
   */
  async getUsageStats(agentId: string) {
    const agent = await this.getAgent(agentId);
    const dailyUsage = await this.getDailyUsage(agentId);
    const monthlyUsage = await this.getMonthlyUsage(agentId);

    // Agent's own limits based on KYA tier
    const agentLimits = {
      perTransaction: parseFloat(agent.limit_per_transaction) || 0,
      daily: parseFloat(agent.limit_daily) || 0,
      monthly: parseFloat(agent.limit_monthly) || 0,
    };

    // Effective limits (min of agent and parent)
    const effectiveLimits = {
      perTransaction: parseFloat(agent.effective_limit_per_tx) || 0,
      daily: parseFloat(agent.effective_limit_daily) || 0,
      monthly: parseFloat(agent.effective_limit_monthly) || 0,
      cappedByParent: agent.effective_limits_capped || false,
    };

    // Parent account info
    const parentAccount = agent.parentAccount ? {
      id: agent.parentAccount.id,
      name: agent.parentAccount.name,
      verificationTier: agent.parentAccount.verification_tier,
      verificationStatus: agent.parentAccount.verification_status,
    } : null;

    return {
      agentId,
      kyaTier: agent.kya_tier,
      status: agent.status,
      // Agent's base limits from KYA tier
      limits: agentLimits,
      // Effective limits (capped by parent if applicable)
      effectiveLimits,
      // Parent account info for transparency
      parentAccount,
      usage: {
        daily: dailyUsage,
        monthly: monthlyUsage,
        dailyRemaining: Math.max(0, effectiveLimits.daily - dailyUsage),
        monthlyRemaining: Math.max(0, effectiveLimits.monthly - monthlyUsage),
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
export function createLimitService(supabase: SupabaseClient, environment: 'test' | 'live' = 'test'): LimitService {
  return new LimitService(supabase, environment);
}

