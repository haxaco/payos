/**
 * Re-scan all failed merchant scans.
 *
 * The 542 failures were caused by missing DB columns (status, confidence, eligibility_signals).
 * Now that the migration has been applied, this script re-scans them with concurrency control.
 *
 * Usage: pnpm --filter @sly/scanner tsx scripts/rescan-failed.ts
 */
import pLimit from 'p-limit';
import { scanDomain } from '../src/scanner.js';
import { getClient } from '../src/db/client.js';

const TENANT_ID = process.env.SCANNER_TENANT_ID || 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';
const CONCURRENCY = parseInt(process.env.SCANNER_CONCURRENCY || '10');

async function main() {
  const db = getClient();

  // Get all failed scans
  const { data: failedScans, error } = await db
    .from('merchant_scans')
    .select('domain, merchant_name, merchant_category, country_code, region')
    .eq('scan_status', 'failed')
    .eq('tenant_id', TENANT_ID);

  if (error) {
    console.error('Failed to fetch failed scans:', error.message);
    process.exit(1);
  }

  if (!failedScans || failedScans.length === 0) {
    console.log('No failed scans to re-process.');
    process.exit(0);
  }

  console.log(`Found ${failedScans.length} failed scans to re-process`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log('');

  const limit = pLimit(CONCURRENCY);
  let completed = 0;
  let failed = 0;
  const startTime = Date.now();

  const tasks = failedScans.map(scan =>
    limit(async () => {
      try {
        const result = await scanDomain({
          tenantId: TENANT_ID,
          domain: scan.domain,
          merchant_name: scan.merchant_name || undefined,
          merchant_category: scan.merchant_category || undefined,
          country_code: scan.country_code || undefined,
          region: scan.region || undefined,
        });
        completed++;
        const status = result.scan_status === 'completed' ? 'OK' : 'FAIL';
        if ((completed + failed) % 25 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
          console.error(`[${elapsed}s] Progress: ${completed + failed}/${failedScans.length} (${completed} ok, ${failed} failed)`);
        }
      } catch (err) {
        failed++;
        console.error(`  ERROR ${scan.domain}: ${err instanceof Error ? err.message : err}`);
      }
    })
  );

  await Promise.allSettled(tasks);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('='.repeat(60));
  console.log(`Re-scan complete in ${elapsed}s`);
  console.log(`  Completed: ${completed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${failedScans.length}`);
  process.exit(0);
}

main();
