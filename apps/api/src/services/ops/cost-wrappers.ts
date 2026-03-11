/**
 * Epic 65, Story 65.5: Layer 3 — Cost Tracking Wrappers
 *
 * withCostTracking() wraps async calls to external providers,
 * recording duration and cost via trackOp().
 */

import { trackOp } from './track-op.js';
import { CostKey, OpType, type CostTrackingInput } from './operation-types.js';

// Map CostKey to the corresponding OpType for event recording
const COST_KEY_TO_OP_TYPE: Record<CostKey, OpType> = {
  [CostKey.CIRCLE_TRANSFER]: OpType.SETTLEMENT_DOMESTIC,
  [CostKey.CIRCLE_PAYOUT]: OpType.SETTLEMENT_CROSS_BORDER,
  [CostKey.CIRCLE_WALLET_CREATE]: OpType.WALLET_CREATED,
  [CostKey.CIRCLE_FX]: OpType.FX_QUOTE,
  [CostKey.CIRCLE_CCTP]: OpType.SETTLEMENT_CCTP_BRIDGE,
  [CostKey.COMPLIANCE_SANCTIONS_CHECK]: OpType.COMPLIANCE_SANCTIONS,
  [CostKey.COMPLIANCE_KYC_CHECK]: OpType.COMPLIANCE_KYC,
  [CostKey.COMPLIANCE_KYB_CHECK]: OpType.COMPLIANCE_KYB,
  [CostKey.COMPLIANCE_TM_CHECK]: OpType.COMPLIANCE_TM,
  [CostKey.FUNDING_ONRAMP]: OpType.WALLET_DEPOSIT,
  [CostKey.FUNDING_OFFRAMP]: OpType.WALLET_WITHDRAWAL,
  [CostKey.SOLANA_PRIORITY_FEE]: OpType.CHAIN_METRIC_RECORDED,
  [CostKey.SOLANA_RENT]: OpType.CHAIN_METRIC_RECORDED,
};

/**
 * Wrap an async function call with cost tracking.
 *
 * Records the call duration, success/failure, and optional cost
 * as an operation event via trackOp().
 *
 * @param input - Cost tracking metadata
 * @param fn - The async function to execute and track
 * @returns The result of fn()
 *
 * @example
 * const result = await withCostTracking(
 *   { tenantId, provider: CostKey.CIRCLE_TRANSFER, subject: `transfer/${id}` },
 *   async () => circleClient.createTransfer(params)
 * );
 */
export async function withCostTracking<T>(
  input: CostTrackingInput,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  let success = true;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const durationMs = Math.round(performance.now() - start);
    const opType = COST_KEY_TO_OP_TYPE[input.provider];

    trackOp({
      tenantId: input.tenantId,
      operation: opType,
      subject: input.subject,
      actorType: input.actorType || 'system',
      actorId: input.actorId || 'system',
      success,
      durationMs,
      data: {
        costKey: input.provider,
        ...input.data,
      },
    });
  }
}
