import pLimit from 'p-limit';
import { scanDomain, normalizeDomain } from '../scanner.js';
import * as queries from '../db/queries.js';

interface BatchTarget {
  domain: string;
  merchant_name?: string;
  merchant_category?: string;
  country_code?: string;
  region?: string;
}

interface BatchOptions {
  skipIfFresh?: boolean;
  concurrency?: number;
  maxRetries?: number;
}

export class BatchProcessor {
  private cancelledBatches = new Set<string>();

  async processBatch(
    batchId: string,
    tenantId: string,
    targets: BatchTarget[],
    options: BatchOptions = {},
  ): Promise<void> {
    const concurrency = options.concurrency || parseInt(process.env.SCANNER_CONCURRENCY || '10');
    const maxRetries = options.maxRetries || 2;
    const limit = pLimit(concurrency);

    // Deduplicate domains
    const seen = new Set<string>();
    const uniqueTargets = targets.filter(t => {
      const domain = normalizeDomain(t.domain);
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    });

    // Update batch as running
    await queries.updateBatch(batchId, {
      status: 'running',
      started_at: new Date().toISOString(),
      completed_targets: 0,
      failed_targets: 0,
    });

    let completed = 0;
    let failed = 0;

    const tasks = uniqueTargets.map(target =>
      limit(async () => {
        // Check if cancelled
        if (this.cancelledBatches.has(batchId)) return;

        let retries = 0;
        while (retries <= maxRetries) {
          try {
            await scanDomain({
              tenantId,
              domain: target.domain,
              merchant_name: target.merchant_name,
              merchant_category: target.merchant_category,
              country_code: target.country_code,
              region: target.region,
              skipIfFresh: options.skipIfFresh,
            });

            completed++;
            break;
          } catch (err) {
            retries++;
            if (retries > maxRetries) {
              failed++;
              console.error(`[Batch ${batchId}] Failed to scan ${target.domain} after ${maxRetries} retries:`, err);
            } else {
              // Brief delay before retry
              await new Promise(r => setTimeout(r, 1000 * retries));
            }
          }
        }

        // Update progress periodically (every 5 scans)
        if ((completed + failed) % 5 === 0 || completed + failed === uniqueTargets.length) {
          await queries.updateBatch(batchId, {
            completed_targets: completed,
            failed_targets: failed,
          }).catch(() => {});
        }
      })
    );

    await Promise.allSettled(tasks);

    // Final update
    if (this.cancelledBatches.has(batchId)) {
      this.cancelledBatches.delete(batchId);
      return;
    }

    await queries.updateBatch(batchId, {
      status: failed === uniqueTargets.length ? 'failed' : 'completed',
      completed_targets: completed,
      failed_targets: failed,
      completed_at: new Date().toISOString(),
    });

    console.log(`[Batch ${batchId}] Complete: ${completed} scanned, ${failed} failed out of ${uniqueTargets.length}`);
  }

  cancelBatch(batchId: string): void {
    this.cancelledBatches.add(batchId);
  }
}
