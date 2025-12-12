import type { SupabaseClient } from '@supabase/supabase-js';
import type { StreamHealth } from '@payos/types';

export interface StreamBalance {
  total: number;
  withdrawn: number;
  available: number;
}

export interface RunwayInfo {
  seconds: number;
  display: string;
  health: StreamHealth;
}

export interface StreamCalculation {
  balance: StreamBalance;
  runway: RunwayInfo;
  fundingRemaining: number;
}

/**
 * Calculate the current streamed amount for an active stream
 */
export function calculateStreamedAmount(stream: {
  status: string;
  startedAt: string;
  totalStreamed: number;
  totalPausedSeconds: number;
  flowRatePerSecond: number;
  fundedAmount: number;
  pausedAt?: string | null;
}): number {
  // Cancelled or completed streams use stored value
  if (stream.status === 'cancelled') {
    return stream.totalStreamed;
  }

  // Paused streams use stored value
  if (stream.status === 'paused') {
    return stream.totalStreamed;
  }

  // Active stream - calculate based on elapsed time
  const startTime = new Date(stream.startedAt).getTime();
  const now = Date.now();
  const elapsedMs = now - startTime;
  const elapsedSeconds = elapsedMs / 1000;

  // Subtract paused time
  const activeSeconds = Math.max(0, elapsedSeconds - (stream.totalPausedSeconds || 0));

  // Calculate streamed amount (capped at funded amount)
  const calculated = activeSeconds * stream.flowRatePerSecond;
  return Math.min(calculated, stream.fundedAmount);
}

/**
 * Calculate runway information for a stream
 */
export function calculateRunway(
  fundedAmount: number,
  totalStreamed: number,
  flowRatePerSecond: number
): RunwayInfo {
  const remaining = fundedAmount - totalStreamed;
  const runwaySeconds = flowRatePerSecond > 0 
    ? Math.floor(remaining / flowRatePerSecond)
    : 0;

  return {
    seconds: runwaySeconds,
    display: formatRunway(runwaySeconds),
    health: calculateHealth(runwaySeconds),
  };
}

/**
 * Full stream calculation
 */
export function calculateStreamState(stream: {
  status: string;
  startedAt: string;
  totalStreamed: number;
  totalWithdrawn: number;
  totalPausedSeconds: number;
  flowRatePerSecond: number;
  fundedAmount: number;
  bufferAmount: number;
  pausedAt?: string | null;
}): StreamCalculation {
  const totalStreamed = calculateStreamedAmount({
    status: stream.status,
    startedAt: stream.startedAt,
    totalStreamed: stream.totalStreamed,
    totalPausedSeconds: stream.totalPausedSeconds,
    flowRatePerSecond: stream.flowRatePerSecond,
    fundedAmount: stream.fundedAmount,
    pausedAt: stream.pausedAt,
  });

  const available = totalStreamed - stream.totalWithdrawn;
  const fundingRemaining = stream.fundedAmount - totalStreamed;
  const runway = calculateRunway(stream.fundedAmount, totalStreamed, stream.flowRatePerSecond);

  return {
    balance: {
      total: totalStreamed,
      withdrawn: stream.totalWithdrawn,
      available: Math.max(0, available),
    },
    runway,
    fundingRemaining: Math.max(0, fundingRemaining),
  };
}

/**
 * Calculate health status based on runway
 */
export function calculateHealth(runwaySeconds: number): StreamHealth {
  const days = runwaySeconds / (24 * 60 * 60);
  if (days > 7) return 'healthy';
  if (days > 1) return 'warning';
  return 'critical';
}

/**
 * Format runway as human-readable string
 */
export function formatRunway(seconds: number): string {
  if (seconds <= 0) return 'Depleted';

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/**
 * Calculate buffer amount (4 hours of flow)
 */
export function calculateBuffer(flowRatePerSecond: number): number {
  const bufferHours = 4;
  return flowRatePerSecond * bufferHours * 60 * 60;
}

/**
 * Calculate minimum funding (buffer + 7 days runway)
 */
export function calculateMinimumFunding(flowRatePerSecond: number): number {
  const buffer = calculateBuffer(flowRatePerSecond);
  const sevenDays = flowRatePerSecond * 7 * 24 * 60 * 60;
  return buffer + sevenDays;
}

/**
 * Log stream event
 */
export async function logStreamEvent(
  supabase: SupabaseClient,
  streamId: string,
  tenantId: string,
  eventType: string,
  actor: { type: string; id: string; name: string },
  data?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('stream_events').insert({
      stream_id: streamId,
      tenant_id: tenantId,
      event_type: eventType,
      actor_type: actor.type,
      actor_id: actor.id,
      actor_name: actor.name,
      data: data || {},
    });
  } catch (error) {
    console.error('Failed to log stream event:', error);
  }
}

/**
 * Update stream's calculated fields
 */
export async function updateStreamState(
  supabase: SupabaseClient,
  streamId: string
): Promise<void> {
  const { data: stream } = await supabase
    .from('streams')
    .select('*')
    .eq('id', streamId)
    .single();

  if (!stream) return;

  const calculation = calculateStreamState({
    status: stream.status,
    startedAt: stream.started_at,
    totalStreamed: parseFloat(stream.total_streamed) || 0,
    totalWithdrawn: parseFloat(stream.total_withdrawn) || 0,
    totalPausedSeconds: stream.total_paused_seconds || 0,
    flowRatePerSecond: parseFloat(stream.flow_rate_per_second),
    fundedAmount: parseFloat(stream.funded_amount),
    bufferAmount: parseFloat(stream.buffer_amount),
    pausedAt: stream.paused_at,
  });

  await supabase
    .from('streams')
    .update({
      total_streamed: calculation.balance.total,
      runway_seconds: calculation.runway.seconds,
      health: calculation.runway.health,
    })
    .eq('id', streamId);
}
