/**
 * Compliance flag worker — periodic tick that drives the compliance
 * engine (apps/api/src/services/compliance/engine.ts).
 *
 * Worker-only architecture (no in-line hooks in the transfer/x402/ACP
 * money paths): every tick scans the last few minutes of completed
 * transfers + new screenings and writes flags via the existing schema.
 * Decoupled so this ships without touching any settlement code.
 *
 * Cadence: 60s in development (and any non-production env), 30s in
 * production. The engine's lookback window is sized to comfortably
 * outlast a missed tick. All emissions are idempotent — re-runs over
 * the same window never duplicate flags.
 */

import { createClient } from '../db/client.js';
import { runComplianceEvaluation } from '../services/compliance/engine.js';

export function startComplianceEvaluator(intervalMs?: number): () => void {
  const ms =
    intervalMs ??
    (process.env.NODE_ENV === 'production' ? 30 * 1000 : 60 * 1000);
  console.log(`[compliance-evaluator] Starting with ${ms / 1000}s interval`);

  const tick = async () => {
    try {
      const supabase: any = createClient();
      const r = await runComplianceEvaluation(supabase);
      const totalEmitted =
        r.emitted.cross_border_amount +
        r.emitted.velocity_check +
        r.emitted.remittance_split_pattern +
        r.emitted.sanctions_potential_match;
      if (totalEmitted > 0) {
        console.log(
          `[compliance-evaluator] tick: scanned=${JSON.stringify(r.scanned)} ` +
            `emitted=${JSON.stringify(r.emitted)} duration=${r.durationMs}ms`
        );
      }
    } catch (error: any) {
      // Never let a worker error kill the process — compliance flags
      // are advisory; their absence must not break settlement.
      console.error('[compliance-evaluator] tick error:', error?.message || error);
    }
  };

  // Kick once on boot so a freshly-deployed instance starts evaluating
  // recent activity without waiting for the first tick.
  tick().catch(() => {});

  const interval = setInterval(tick, ms);
  return () => {
    console.log('[compliance-evaluator] Stopping');
    clearInterval(interval);
  };
}
