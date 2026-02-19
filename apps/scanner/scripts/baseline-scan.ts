/**
 * Story 56.18: Run the 1,000-merchant baseline scan.
 *
 * 1. Seeds the sme-midmarket-300.csv (any not-yet-seeded original CSVs too)
 * 2. Scans all merchants with status='pending'
 * 3. Prints summary stats when done
 *
 * Usage: pnpm --filter @sly/scanner tsx scripts/baseline-scan.ts
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';
import { scanDomain } from '../src/scanner.js';
import { getClient } from '../src/db/client.js';
import { parseCSV } from '../src/queue/csv-parser.js';
import { insertDemandIntelligence } from '../src/db/queries.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, '../seed');
const REPORTS_DIR = resolve(__dirname, '../../../scanner-reports');
const TENANT_ID = process.env.SCANNER_TENANT_ID || 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';
const CONCURRENCY = parseInt(process.env.SCANNER_CONCURRENCY || '10');

async function seedCSV(filename: string) {
  const csvPath = resolve(SEED_DIR, filename);
  let csvText: string;
  try {
    csvText = readFileSync(csvPath, 'utf-8');
  } catch {
    console.log(`  Skipping ${filename} (not found)`);
    return 0;
  }

  const targets = parseCSV(csvText);
  const db = getClient();

  let seeded = 0;
  for (const target of targets) {
    const domain = target.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    const { error } = await (db.from('merchant_scans') as any).upsert(
      {
        tenant_id: TENANT_ID,
        domain,
        url: `https://${domain}`,
        merchant_name: target.merchant_name,
        merchant_category: target.merchant_category,
        country_code: target.country_code,
        region: target.region,
        scan_status: 'pending',
        scan_version: '1.0',
      },
      { onConflict: 'tenant_id,domain', ignoreDuplicates: true },
    );
    if (!error) seeded++;
  }

  console.log(`  Seeded ${seeded} merchants from ${filename}`);
  return seeded;
}

async function seedAll() {
  console.log('=== Phase 1: Seeding merchant targets ===');

  const csvFiles = [
    'shopify-top-500.csv',
    'dtc-brands-us-200.csv',
    'latam-ecommerce-100.csv',
    'b2b-saas-100.csv',
    'enterprise-procurement-50.csv',
    'travel-hospitality-50.csv',
    'sme-midmarket-300.csv',
    'uk-eu-latam-africa-300.csv',
  ];

  let totalSeeded = 0;
  for (const file of csvFiles) {
    try {
      totalSeeded += await seedCSV(file);
    } catch (err) {
      console.error(`  Failed to seed ${file}:`, err instanceof Error ? err.message : err);
    }
  }

  // Seed demand intelligence
  try {
    const raw = readFileSync(resolve(SEED_DIR, 'demand-intelligence-seed.json'), 'utf-8');
    const data = JSON.parse(raw);
    await insertDemandIntelligence(data);
    console.log(`  Seeded ${data.length} demand intelligence data points`);
  } catch (err) {
    console.log('  Demand intelligence already seeded or failed:', err instanceof Error ? err.message : err);
  }

  console.log(`Total seeded: ${totalSeeded}`);
  console.log('');
}

async function scanPending() {
  console.log('=== Phase 2: Scanning pending merchants ===');
  const db = getClient();

  const { data: pendingScans, error } = await db
    .from('merchant_scans')
    .select('domain, merchant_name, merchant_category, country_code, region')
    .eq('scan_status', 'pending')
    .eq('tenant_id', TENANT_ID);

  if (error) {
    console.error('Failed to fetch pending scans:', error.message);
    return;
  }

  if (!pendingScans || pendingScans.length === 0) {
    console.log('No pending scans. All merchants already scanned!');
    return;
  }

  console.log(`Found ${pendingScans.length} pending scans`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log('');

  const limit = pLimit(CONCURRENCY);
  let completed = 0;
  let failed = 0;
  const startTime = Date.now();

  const tasks = pendingScans.map(scan =>
    limit(async () => {
      try {
        await scanDomain({
          tenantId: TENANT_ID,
          domain: scan.domain,
          merchant_name: scan.merchant_name || undefined,
          merchant_category: scan.merchant_category || undefined,
          country_code: scan.country_code || undefined,
          region: scan.region || undefined,
        });
        completed++;
      } catch (err) {
        failed++;
        console.error(`  ERROR ${scan.domain}: ${err instanceof Error ? err.message : err}`);
      }

      const total = completed + failed;
      if (total % 50 === 0 || total === pendingScans.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`[${elapsed}s] Progress: ${total}/${pendingScans.length} (${completed} ok, ${failed} failed)`);
      }
    })
  );

  await Promise.allSettled(tasks);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log(`Scan complete in ${elapsed}s — ${completed} completed, ${failed} failed`);
  console.log('');
}

async function generateReport() {
  console.log('=== Phase 3: Generating baseline report ===');
  const db = getClient();

  // Get all completed scans
  const { data: scans, error } = await db
    .from('merchant_scans')
    .select('domain, merchant_name, merchant_category, country_code, region, readiness_score, protocol_score, data_score, accessibility_score, checkout_score, scan_status, last_scanned_at')
    .eq('tenant_id', TENANT_ID)
    .eq('scan_status', 'completed')
    .order('readiness_score', { ascending: false });

  if (error) {
    console.error('Failed to fetch scans:', error.message);
    return;
  }

  if (!scans || scans.length === 0) {
    console.log('No completed scans to report on.');
    return;
  }

  // Get protocol results for all scans
  const { data: allScansWithId } = await db
    .from('merchant_scans')
    .select('id, domain')
    .eq('tenant_id', TENANT_ID)
    .eq('scan_status', 'completed');

  const scanIds = (allScansWithId || []).map(s => s.id);
  const domainById = Object.fromEntries((allScansWithId || []).map(s => [s.id, s.domain]));

  let protocolResults: Array<{ merchant_scan_id: string; protocol: string; detected: boolean; status: string; is_functional: boolean }> = [];
  // Fetch in chunks of 200 to avoid query limits
  for (let i = 0; i < scanIds.length; i += 200) {
    const chunk = scanIds.slice(i, i + 200);
    const { data: protoData } = await db
      .from('scan_protocol_results')
      .select('merchant_scan_id, protocol, detected, status, is_functional')
      .in('merchant_scan_id', chunk);
    if (protoData) protocolResults = protocolResults.concat(protoData);
  }

  // Aggregate stats
  const totalScans = scans.length;
  const avgReadiness = Math.round(scans.reduce((s, r) => s + r.readiness_score, 0) / totalScans);
  const avgProtocol = Math.round(scans.reduce((s, r) => s + r.protocol_score, 0) / totalScans);
  const avgData = Math.round(scans.reduce((s, r) => s + r.data_score, 0) / totalScans);
  const avgAccess = Math.round(scans.reduce((s, r) => s + r.accessibility_score, 0) / totalScans);
  const avgCheckout = Math.round(scans.reduce((s, r) => s + r.checkout_score, 0) / totalScans);
  const maxScore = Math.max(...scans.map(s => s.readiness_score));
  const minScore = Math.min(...scans.map(s => s.readiness_score));

  // By region
  const byRegion: Record<string, typeof scans> = {};
  for (const scan of scans) {
    const r = scan.region || 'unknown';
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(scan);
  }

  // By category
  const byCategory: Record<string, typeof scans> = {};
  for (const scan of scans) {
    const c = scan.merchant_category || 'other';
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(scan);
  }

  // Grade distribution
  function getGrade(score: number): string {
    if (score >= 40) return 'A';
    if (score >= 30) return 'B';
    if (score >= 25) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const scan of scans) {
    gradeDistribution[getGrade(scan.readiness_score) as keyof typeof gradeDistribution]++;
  }

  // Protocol adoption
  const protocolAdoption: Record<string, { confirmed: number; platform_enabled: number; eligible: number; not_detected: number }> = {};
  const confirmedProtocols: Array<{ domain: string; protocol: string; status: string }> = [];

  for (const pr of protocolResults) {
    if (!protocolAdoption[pr.protocol]) {
      protocolAdoption[pr.protocol] = { confirmed: 0, platform_enabled: 0, eligible: 0, not_detected: 0 };
    }
    const status = pr.status || 'not_detected';
    if (status === 'confirmed') {
      protocolAdoption[pr.protocol].confirmed++;
      confirmedProtocols.push({ domain: domainById[pr.merchant_scan_id] || 'unknown', protocol: pr.protocol, status });
    } else if (status === 'platform_enabled') {
      protocolAdoption[pr.protocol].platform_enabled++;
    } else if (status === 'eligible') {
      protocolAdoption[pr.protocol].eligible++;
    } else {
      protocolAdoption[pr.protocol].not_detected++;
    }
  }

  // Build report
  const lines: string[] = [];
  lines.push('# State of Agentic Commerce — Q1 2026 Baseline Report');
  lines.push(`## ${totalScans.toLocaleString()} Merchants Scanned | February 19, 2026`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`Scanned **${totalScans.toLocaleString()} merchants** across ${Object.keys(byRegion).length} regions and ${Object.keys(byCategory).length} categories. This is Sly\'s first comprehensive baseline of the agentic commerce landscape.`);
  lines.push('');
  lines.push('### Key Metrics');
  lines.push(`- **Average Readiness Score:** ${avgReadiness}/100`);
  lines.push(`- **Score Range:** ${minScore}–${maxScore}`);
  lines.push(`- **Grade A (40+):** ${gradeDistribution.A} merchants (${((gradeDistribution.A / totalScans) * 100).toFixed(1)}%)`);
  lines.push(`- **Confirmed Protocol Support:** ${confirmedProtocols.length} merchants`);
  lines.push(`- **Market Stage:** Early — massive first-mover opportunity for Sly`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Score Distribution');
  lines.push('');
  lines.push('| Grade | Range | Count | Share |');
  lines.push('|-------|-------|-------|-------|');
  lines.push(`| A | 40+ | ${gradeDistribution.A} | ${((gradeDistribution.A / totalScans) * 100).toFixed(1)}% |`);
  lines.push(`| B | 30–39 | ${gradeDistribution.B} | ${((gradeDistribution.B / totalScans) * 100).toFixed(1)}% |`);
  lines.push(`| C | 25–29 | ${gradeDistribution.C} | ${((gradeDistribution.C / totalScans) * 100).toFixed(1)}% |`);
  lines.push(`| D | 20–24 | ${gradeDistribution.D} | ${((gradeDistribution.D / totalScans) * 100).toFixed(1)}% |`);
  lines.push(`| F | <20 | ${gradeDistribution.F} | ${((gradeDistribution.F / totalScans) * 100).toFixed(1)}% |`);
  lines.push('');
  lines.push('### Sub-Score Averages');
  lines.push('');
  lines.push('| Sub-Score | Average |');
  lines.push('|-----------|---------|');
  lines.push(`| Protocol | ${avgProtocol}/100 |`);
  lines.push(`| Data Quality | ${avgData}/100 |`);
  lines.push(`| Accessibility | ${avgAccess}/100 |`);
  lines.push(`| Checkout | ${avgCheckout}/100 |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Regional breakdown
  lines.push('## Regional Breakdown');
  lines.push('');
  lines.push('| Region | Merchants | Avg Score | Max Score | Grade A | Grade B |');
  lines.push('|--------|-----------|-----------|-----------|---------|---------|');

  for (const [region, regionScans] of Object.entries(byRegion).sort((a, b) => b[1].length - a[1].length)) {
    const avg = Math.round(regionScans.reduce((s, r) => s + r.readiness_score, 0) / regionScans.length);
    const max = Math.max(...regionScans.map(s => s.readiness_score));
    const gradeA = regionScans.filter(s => s.readiness_score >= 40).length;
    const gradeB = regionScans.filter(s => s.readiness_score >= 30 && s.readiness_score < 40).length;
    lines.push(`| ${region} | ${regionScans.length} | ${avg} | ${max} | ${gradeA} | ${gradeB} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Category breakdown
  lines.push('## Category Breakdown');
  lines.push('');
  lines.push('| Category | Merchants | Avg Score | Max Score |');
  lines.push('|----------|-----------|-----------|-----------|');

  for (const [cat, catScans] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
    const avg = Math.round(catScans.reduce((s, r) => s + r.readiness_score, 0) / catScans.length);
    const max = Math.max(...catScans.map(s => s.readiness_score));
    lines.push(`| ${cat} | ${catScans.length} | ${avg} | ${max} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Protocol adoption
  lines.push('## Protocol Adoption');
  lines.push('');
  lines.push('| Protocol | Confirmed | Platform Enabled | Eligible | Not Detected |');
  lines.push('|----------|-----------|------------------|----------|--------------|');

  const protocolOrder = ['ucp', 'acp', 'nlweb', 'x402', 'mcp', 'ap2', 'visa_vic', 'mastercard'];
  for (const proto of protocolOrder) {
    const data = protocolAdoption[proto];
    if (data) {
      lines.push(`| ${proto} | ${data.confirmed} | ${data.platform_enabled} | ${data.eligible} | ${data.not_detected} |`);
    }
  }

  lines.push('');

  if (confirmedProtocols.length > 0) {
    lines.push('### Confirmed Protocol Detections');
    lines.push('');
    lines.push('| Domain | Protocol |');
    lines.push('|--------|----------|');
    for (const cp of confirmedProtocols) {
      lines.push(`| ${cp.domain} | ${cp.protocol} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Top 25 prospects
  lines.push('## Top 25 Prospects');
  lines.push('');
  lines.push('| Rank | Domain | Name | Category | Region | Score |');
  lines.push('|------|--------|------|----------|--------|-------|');

  for (let i = 0; i < Math.min(25, scans.length); i++) {
    const s = scans[i];
    lines.push(`| ${i + 1} | ${s.domain} | ${s.merchant_name || '-'} | ${s.merchant_category || '-'} | ${s.region || '-'} | ${s.readiness_score} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push('- **Scanner version:** v2 with status/confidence/eligibility detection');
  lines.push('- **8 protocol probes:** UCP, ACP, x402, AP2, MCP, NLWeb, Visa VIC, Mastercard AgentPay');
  lines.push('- **Analyzers:** Structured data (JSON-LD, microdata, OpenGraph), accessibility (robots.txt, CAPTCHA, checkout), business model classification');
  lines.push('- **Scoring:** Weighted composite — Protocol (30%), Data Quality (25%), Accessibility (20%), Checkout (25%)');
  lines.push(`- **Scan date:** February 19, 2026`);
  lines.push(`- **Total merchants scanned:** ${totalScans}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Generated by Sly Agentic Commerce Demand Scanner (Epic 56)*');

  const report = lines.join('\n');

  // Write report
  const reportPath = resolve(REPORTS_DIR, 'baseline-q1-2026-report.md');
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`Report written to ${reportPath}`);

  // Also write CSV export of all scans
  const csvLines = ['domain,merchant_name,merchant_category,country_code,region,readiness_score,protocol_score,data_score,accessibility_score,checkout_score'];
  for (const s of scans) {
    csvLines.push(`${s.domain},${(s.merchant_name || '').replace(/,/g, ';')},${s.merchant_category || ''},${s.country_code || ''},${s.region || ''},${s.readiness_score},${s.protocol_score},${s.data_score},${s.accessibility_score},${s.checkout_score}`);
  }
  const csvPath = resolve(REPORTS_DIR, 'baseline-q1-2026-results.csv');
  writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');
  console.log(`CSV written to ${csvPath}`);

  console.log('');
  console.log('='.repeat(60));
  console.log('BASELINE REPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total merchants: ${totalScans}`);
  console.log(`Average readiness: ${avgReadiness}/100`);
  console.log(`Grade A (40+): ${gradeDistribution.A}`);
  console.log(`Grade B (30-39): ${gradeDistribution.B}`);
  console.log(`Confirmed protocols: ${confirmedProtocols.length}`);
  console.log(`Regions: ${Object.keys(byRegion).join(', ')}`);
  console.log(`Categories: ${Object.keys(byCategory).join(', ')}`);
}

async function main() {
  console.log('========================================');
  console.log('  Story 56.18: Baseline Scan');
  console.log('  1,000+ Merchant Agentic Commerce Scan');
  console.log('========================================');
  console.log('');

  await seedAll();
  await scanPending();
  await generateReport();

  console.log('');
  console.log('Done! Stories 56.6 + 56.18 complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Baseline scan failed:', err);
  process.exit(1);
});
