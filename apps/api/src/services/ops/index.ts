/**
 * Epic 65: Operations Observability — Barrel Export
 */

export { OpType, OpCategory, CostKey, getCategoryFromOpType, getProtocolFromOpType } from './operation-types.js';
export type {
  OperationEvent,
  TrackOpInput,
  CostTrackingInput,
  RequestCountRow,
  UsageSummary,
  UsageOperationsQuery,
  Protocol,
} from './operation-types.js';

export { trackOp, startOpTracker, stopOpTracker, flushOpBuffer, getOpBufferSize } from './track-op.js';
export { recordRequest, startRequestCounter, stopRequestCounter, flushRequestCounters } from './request-counter.js';
export { withCostTracking } from './cost-wrappers.js';
