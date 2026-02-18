/**
 * Quick CLI test: run probes + enrichment on a few merchants
 * Usage: pnpm --filter @sly/scanner tsx scripts/test-merchants.ts
 */
import { runProbes, DEFAULT_SCAN_CONFIG } from '../src/probes/index.js';
import { analyzeAccessibility } from '../src/analyzers/accessibility.js';
import { analyzeStructuredData } from '../src/analyzers/structured-data.js';
import { enrichProbeResults } from '../src/analyzers/eligibility-enricher.js';
import { classifyBusinessModel, applyBusinessModelFilter } from '../src/analyzers/business-model.js';
import type { ProbeResult } from '../src/probes/types.js';

const MERCHANTS = [
  { domain: 'x402engine.app', note: 'x402 manifest — 51 APIs (image, video, LLM, code)' },
  { domain: 'api.neynar.com', note: 'Neynar API — x402 on Farcaster data endpoints' },
  { domain: '402.pinata.cloud', note: 'Pinata — IPFS uploads via x402' },
  { domain: 'firecrawl.dev', note: 'Firecrawl — web scraping API' },
  { domain: 'blockrun.ai', note: 'BlockRun — LLM gateway' },
  { domain: 'asterpay.io', note: 'AsterPay — market data, DeFi analytics' },
  { domain: 'blackswan.wtf', note: 'BlackSwan — risk intelligence' },
  { domain: 'x402stt.dtelecom.org', note: 'dTelecom — speech-to-text' },
];

function statusLabel(p: ProbeResult): string {
  switch (p.status) {
    case 'confirmed': return p.is_functional ? 'Confirmed (Functional)' : 'Confirmed';
    case 'eligible': return `Eligible${p.eligibility_signals?.length ? ` — ${p.eligibility_signals[0]}` : ''}`;
    case 'platform_enabled': return `Platform-Enabled${p.eligibility_signals?.length ? ` — ${p.eligibility_signals[0]}` : ''}`;
    case 'not_applicable': return 'N/A (business model)';
    default: return 'Not detected';
  }
}

async function testMerchant(domain: string, note: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SCANNING: ${domain}`);
  console.log(`EXPECTED: ${note}`);
  console.log('='.repeat(70));

  const config = { ...DEFAULT_SCAN_CONFIG, timeout_ms: 5000 };

  const [probeResults, accessibilityData, structuredData] = await Promise.all([
    runProbes(domain, config),
    analyzeAccessibility(domain, config),
    analyzeStructuredData(domain, config),
  ]);

  console.log(`\nPlatform: ${accessibilityData.ecommerce_platform || 'none'}`);
  console.log(`Payment Processors: ${accessibilityData.payment_processors.join(', ') || 'none'}`);

  const confirmedProtocols = probeResults
    .filter(p => p.status === 'confirmed')
    .map(p => p.protocol);

  const businessModel = classifyBusinessModel({
    ecommerce_platform: accessibilityData.ecommerce_platform,
    has_schema_product: structuredData.has_schema_product,
    has_schema_offer: structuredData.has_schema_offer,
    product_count: structuredData.product_count,
    has_homepage: accessibilityData.homepage_accessible,
    detected_protocols: confirmedProtocols,
  });
  console.log(`Business Model: ${businessModel}`);

  let enriched = enrichProbeResults(probeResults, accessibilityData);
  enriched = applyBusinessModelFilter(enriched, businessModel);

  console.log(`\nProtocol Results:`);
  for (const p of enriched) {
    const label = statusLabel(p);
    const conf = `[${p.confidence}]`;
    console.log(`  ${p.protocol.padEnd(22)} ${label.padEnd(50)} ${conf}`);
    if (p.status === 'confirmed' && p.detection_method) {
      console.log(`    Detection: ${p.detection_method}`);
    }
    if (p.capabilities && Object.keys(p.capabilities).length > 0) {
      console.log(`    Capabilities: ${JSON.stringify(p.capabilities, null, 2).split('\n').join('\n    ')}`);
    }
  }
}

async function main() {
  console.log('Scanner v2 Detection Methodology Test');
  console.log('Testing with real merchants...\n');

  for (const { domain, note } of MERCHANTS) {
    try {
      await testMerchant(domain, note);
    } catch (err) {
      console.error(`  ERROR scanning ${domain}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('DONE');
}

main();
