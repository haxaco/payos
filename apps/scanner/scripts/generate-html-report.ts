#!/usr/bin/env npx tsx
/**
 * Generate interactive HTML report from baseline CSV scan results.
 * Usage: npx tsx scripts/generate-html-report.ts [csv-path] [output-path]
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const csvPath = process.argv[2] || resolve(__dirname, '../../../scanner-reports/baseline-q1-2026-results.csv');
const outputPath = process.argv[3] || resolve(__dirname, '../../../scanner-reports/baseline-q1-2026-report.html');

// --- Parse CSV ---
interface Merchant {
  domain: string;
  name: string;
  category: string;
  country: string;
  region: string;
  score: number;
  protocol: number;
  data: number;
  accessibility: number;
  checkout: number;
}

const raw = readFileSync(csvPath, 'utf-8').trim().split('\n');
const header = raw[0].split(',');
const merchants: Merchant[] = raw.slice(1).map(line => {
  const cols = line.split(',');
  return {
    domain: cols[0] || '',
    name: cols[1] || cols[0] || '',
    category: cols[2] || 'other',
    country: cols[3] || '',
    region: cols[4] || 'unknown',
    score: parseInt(cols[5]) || 0,
    protocol: parseInt(cols[6]) || 0,
    data: parseInt(cols[7]) || 0,
    accessibility: parseInt(cols[8]) || 0,
    checkout: parseInt(cols[9]) || 0,
  };
}).sort((a, b) => b.score - a.score);

const total = merchants.length;

// --- Compute statistics ---
function avg(arr: number[]): number {
  return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
}

function grade(score: number): string {
  if (score >= 40) return 'a';
  if (score >= 30) return 'b';
  if (score >= 25) return 'c';
  if (score >= 20) return 'd';
  return 'f';
}

function badgeClass(g: string): string {
  return `badge-${g}`;
}

function badge(score: number): string {
  const g = grade(score);
  return `<span class="badge ${badgeClass(g)}">${score}</span>`;
}

const scores = merchants.map(m => m.score);
const avgScore = avg(scores);
const minScore = Math.min(...scores);
const maxScore = Math.max(...scores);

const gradeA = merchants.filter(m => m.score >= 40);
const gradeB = merchants.filter(m => m.score >= 30 && m.score < 40);
const gradeC = merchants.filter(m => m.score >= 25 && m.score < 30);
const gradeD = merchants.filter(m => m.score >= 20 && m.score < 25);
const gradeF = merchants.filter(m => m.score < 20);

const avgProtocol = avg(merchants.map(m => m.protocol));
const avgData = avg(merchants.map(m => m.data));
const avgAccess = avg(merchants.map(m => m.accessibility));
const avgCheckout = avg(merchants.map(m => m.checkout));

// Protocol detection: score > 0 means some protocol detected
const protocolMerchants = merchants.filter(m => m.protocol > 0);

// Regions
type RegionStats = { name: string; count: number; avg: number; max: number; gradeA: number; gradeB: number; merchants: Merchant[] };
const regionMap = new Map<string, Merchant[]>();
merchants.forEach(m => {
  const r = m.region || 'unknown';
  if (!regionMap.has(r)) regionMap.set(r, []);
  regionMap.get(r)!.push(m);
});
const regions: RegionStats[] = Array.from(regionMap.entries())
  .map(([name, ms]) => ({
    name,
    count: ms.length,
    avg: avg(ms.map(m => m.score)),
    max: Math.max(...ms.map(m => m.score)),
    gradeA: ms.filter(m => m.score >= 40).length,
    gradeB: ms.filter(m => m.score >= 30 && m.score < 40).length,
    merchants: ms,
  }))
  .sort((a, b) => b.count - a.count);

// Categories
type CatStats = { name: string; count: number; avg: number; max: number; merchants: Merchant[] };
const catMap = new Map<string, Merchant[]>();
merchants.forEach(m => {
  const c = m.category || 'other';
  if (!catMap.has(c)) catMap.set(c, []);
  catMap.get(c)!.push(m);
});
const categories: CatStats[] = Array.from(catMap.entries())
  .map(([name, ms]) => ({
    name,
    count: ms.length,
    avg: avg(ms.map(m => m.score)),
    max: Math.max(...ms.map(m => m.score)),
    merchants: ms,
  }))
  .sort((a, b) => b.count - a.count);

// Region colors
const regionColors: Record<string, string> = {
  north_america: '#3B82F6',
  europe: '#8B5CF6',
  latam: '#10B981',
  africa: '#F59E0B',
  apac: '#06B6D4',
  mena: '#EC4899',
  unknown: '#6B7280',
  asia: '#EF4444',
  oceania: '#0EA5E9',
};

const regionLabels: Record<string, string> = {
  north_america: 'North America',
  europe: 'Europe',
  latam: 'LATAM',
  africa: 'Africa',
  apac: 'Asia-Pacific',
  mena: 'MENA',
  unknown: 'Unknown',
  asia: 'Asia',
  oceania: 'Oceania',
};

// Category colors
const catColors: Record<string, string> = {
  retail: '#8B5CF6',
  fintech: '#3B82F6',
  marketplace: '#10B981',
  saas: '#06B6D4',
  other: '#6B7280',
  travel: '#F59E0B',
  b2b: '#EC4899',
  media: '#EF4444',
  api_computing: '#0EA5E9',
  healthcare: '#14B8A6',
  restaurant: '#F97316',
  protocol_active: '#7C3AED',
  telecom: '#78716C',
};

const catLabels: Record<string, string> = {
  retail: 'Retail & D2C',
  fintech: 'Fintech & Payments',
  marketplace: 'Marketplace',
  saas: 'SaaS & B2B',
  other: 'Other',
  travel: 'Travel & Hospitality',
  b2b: 'B2B & Procurement',
  media: 'Media & Content',
  api_computing: 'API & Computing',
  healthcare: 'Healthcare',
  restaurant: 'Food & Delivery',
  protocol_active: 'Protocol Active',
  telecom: 'Telecom',
};

// Size heuristic
function guessSize(m: Merchant): string {
  const big = ['amazon', 'apple', 'google', 'microsoft', 'samsung', 'nike', 'ikea', 'walmart', 'target', 'costco',
    'visa', 'mastercard', 'paypal', 'salesforce', 'hubspot', 'workday', 'airbnb', 'uber', 'booking',
    'decathlon', 'carrefour', 'lidl', 'marks', 'harrods', 'shein', 'temu', 'alibaba', 'mercadolibre',
    'falabella', 'americanas', 'magazine', 'renner', 'claro', 'vivo', 'mtn', 'vodafone', 'telcel',
    'amex', 'american express', 'nordstrom', 'bestbuy', 'sephora', 'wayfair', 'etsy', 'zappos'];
  const mid = ['klarna', 'adyen', 'stripe', 'mollie', 'nubank', 'n26', 'monzo', 'revolut', 'wise',
    'pipedrive', 'sumup', 'ledger', 'databricks', 'snowflake', 'cloudflare', 'okta'];
  const d = m.domain.toLowerCase();
  const n = m.name.toLowerCase();
  if (big.some(b => d.includes(b) || n.includes(b))) return 'enterprise';
  if (mid.some(b => d.includes(b) || n.includes(b))) return 'mid-market';
  if (m.score >= 40) return 'sme';
  return 'sme';
}

// Determine segment/highlights
function getProtocolTags(m: Merchant): string {
  if (m.protocol >= 26) return '<span class="proto-tag proto-confirmed">UCP</span>';
  if (m.protocol >= 16) return '<span class="proto-tag proto-enabled">UCP</span> <span class="proto-tag proto-unverified">?</span>';
  if (m.protocol >= 10) return '<span class="proto-tag proto-enabled">ACP</span> <span class="proto-tag proto-unverified">?</span>';
  if (m.protocol >= 5) return '<span class="proto-tag proto-signal">NLWeb</span> <span class="proto-tag proto-unverified">?</span>';
  if (m.protocol > 0) return '<span class="proto-tag proto-signal">Signal</span> <span class="proto-tag proto-unverified">?</span>';
  return '';
}

// --- Prospect deep-dive analysis ---

function analyzeProtocols(m: Merchant): { tags: string; summary: string; details: string[]; verified: boolean } {
  const details: string[] = [];
  let tags = '';
  let summary = '';
  let verified = false;

  if (m.protocol >= 26) {
    verified = true;
    tags = '<span class="proto-tag proto-confirmed">UCP Confirmed</span>';
    summary = 'UCP endpoint detected (likely Shopify /.well-known/ucp). Platform-enabled for agent checkout.';
    details.push('UCP (Universal Checkout Protocol) confirmed &mdash; agents can discover checkout capabilities');
    details.push('Likely running on Shopify, which provides native UCP support');
    details.push('ACP (Agent Checkout Protocol) may also be platform-enabled via Shopify');
  } else if (m.protocol >= 16) {
    tags = '<span class="proto-tag proto-enabled">UCP Enabled</span> <span class="proto-tag proto-unverified">Unverified</span>';
    summary = 'UCP platform-enabled (inferred from platform). No live endpoint confirmed &mdash; /.well-known/ucp may return 404.';
    details.push('UCP detected at platform level but <strong>not confirmed via live endpoint</strong>');
    details.push('Platform (likely Shopify) supports UCP but merchant may not have activated it');
    details.push('⚠ Use the "Fetch" button below to verify if the endpoint actually responds');
  } else if (m.protocol >= 10) {
    tags = '<span class="proto-tag proto-enabled">ACP Signal</span> <span class="proto-tag proto-unverified">Unverified</span>';
    summary = 'ACP signal inferred from platform/infrastructure patterns. No live endpoint confirmed.';
    details.push('ACP (Agent Checkout Protocol) signal inferred from platform detection');
    details.push('<strong>Not verified</strong> &mdash; no /.well-known/acp endpoint was confirmed during scan');
    details.push('This score reflects platform capability, not a live endpoint (e.g. Zappos/Amazon infra may trigger ACP signals without an actual ACP endpoint)');
    details.push('⚠ Use the "Fetch" button below to verify &mdash; expect a 404 if the signal is a false positive');
  } else if (m.protocol >= 5) {
    tags = '<span class="proto-tag proto-signal">NLWeb</span> <span class="proto-tag proto-unverified">Unverified</span>';
    summary = 'NLWeb signal detected. Not confirmed as a live endpoint.';
    details.push('NLWeb protocol signal detected &mdash; may support natural language queries');
    details.push('<strong>Not verified</strong> &mdash; endpoint may not respond');
  } else if (m.protocol > 0) {
    tags = '<span class="proto-tag proto-signal">Weak Signal</span> <span class="proto-tag proto-unverified">Unverified</span>';
    summary = 'Weak protocol signal detected. Likely a false positive from platform heuristics.';
    details.push('Minor protocol signal detected but not confirmed &mdash; likely a false positive');
  } else {
    tags = '<span class="proto-tag proto-none">None</span>';
    summary = 'No agentic commerce protocols detected.';
    details.push('No UCP, ACP, x402, AP2, MCP, NLWeb, or card network protocols found');
    details.push('This is the norm &mdash; 97%+ of merchants have zero protocol support');
  }

  // x402 / AP2 always absent for now
  details.push('x402 (micropayments): Not detected');
  details.push('AP2 (Agent Payment Protocol): Not detected');

  return { tags, summary, details, verified };
}

function analyzeWhyHighScore(m: Merchant): string[] {
  const reasons: string[] = [];

  // Protocol
  if (m.protocol >= 26) reasons.push('Strong protocol support (UCP confirmed) &mdash; one of very few merchants globally with a live agent checkout endpoint');
  else if (m.protocol >= 16) reasons.push('Platform-level UCP support gives a protocol advantage over 97% of merchants <em style="color:var(--orange);">(unverified &mdash; endpoint may not respond)</em>');
  else if (m.protocol > 0) reasons.push('Has protocol signals boosting score, but <em style="color:var(--orange);">these are unverified</em> &mdash; inferred from platform detection, not a live endpoint');

  // Data quality
  if (m.data >= 80) reasons.push('Exceptional structured data quality (' + m.data + '/100) &mdash; rich JSON-LD, Schema.org Product/Offer markup, and complete product attributes (price, availability, SKU, images)');
  else if (m.data >= 60) reasons.push('Strong structured data (' + m.data + '/100) &mdash; JSON-LD present with good product schema coverage and OpenGraph metadata');
  else if (m.data >= 35) reasons.push('Moderate structured data (' + m.data + '/100) &mdash; some schema markup present');

  // Accessibility
  if (m.accessibility >= 100) reasons.push('Perfect accessibility (100/100) &mdash; no bot blocking, no CAPTCHA, no JavaScript requirement, fully crawlable by AI agents');
  else if (m.accessibility >= 85) reasons.push('Excellent accessibility (' + m.accessibility + '/100) &mdash; very few barriers for AI agent access');
  else if (m.accessibility >= 75) reasons.push('Good accessibility (' + m.accessibility + '/100) &mdash; minor restrictions (may require JS or have partial bot rules)');

  // Checkout
  if (m.checkout >= 75) reasons.push('Excellent checkout experience (' + m.checkout + '/100) &mdash; likely offers guest checkout, low step count, and multiple payment methods');
  else if (m.checkout >= 60) reasons.push('Good checkout (' + m.checkout + '/100) &mdash; guest checkout available, reasonable number of steps');
  else if (m.checkout >= 40) reasons.push('Moderate checkout (' + m.checkout + '/100) &mdash; some friction but workable');

  return reasons;
}

function analyzePlaywright(m: Merchant): {
  verdict: string;        // 'Excellent' | 'Good' | 'Possible' | 'Difficult' | 'Not Recommended'
  color: string;
  score: number;          // 0–100 composite
  reasons: string[];
  blockers: string[];
  strategy: string;
} {
  let score = 0;
  const reasons: string[] = [];
  const blockers: string[] = [];

  // If protocol-native, Playwright isn't the right approach
  if (m.protocol >= 16) {
    return {
      verdict: 'Not Needed',
      color: '#6B7280',
      score: 0,
      reasons: ['This merchant supports UCP &mdash; use the protocol API directly instead of browser automation'],
      blockers: [],
      strategy: 'Skip Playwright. Use <code>ucp_discover</code> → <code>ucp_create_checkout</code> → <code>ucp_complete_checkout</code> for a fully API-driven flow.',
    };
  }

  // Guest checkout is the single most important signal (+35)
  if (m.checkout >= 60) {
    score += 35;
    reasons.push('Guest checkout likely available &mdash; no account creation flow to automate');
  } else if (m.checkout >= 40) {
    score += 20;
    reasons.push('Moderate checkout friction &mdash; guest checkout may be available');
  } else {
    score += 5;
    blockers.push('Low checkout score suggests account creation may be required');
  }

  // Accessibility is critical — CAPTCHA / bot blocking kills Playwright (+30)
  if (m.accessibility >= 95) {
    score += 30;
    reasons.push('No bot blocking, no CAPTCHA &mdash; Playwright will not be intercepted');
  } else if (m.accessibility >= 75) {
    score += 20;
    reasons.push('Minor accessibility barriers &mdash; may need JS rendering but no hard blocks');
  } else if (m.accessibility >= 50) {
    score += 10;
    blockers.push('Moderate bot protections detected &mdash; may encounter CAPTCHA or JS challenges');
  } else {
    score += 0;
    blockers.push('Aggressive bot blocking detected &mdash; CAPTCHA, WAF, or anti-automation likely to block Playwright');
  }

  // Structured data helps Playwright find products (+20)
  if (m.data >= 60) {
    score += 20;
    reasons.push('Rich structured data &mdash; Playwright can use JSON-LD selectors to find products, prices, and add-to-cart buttons');
  } else if (m.data >= 35) {
    score += 12;
    reasons.push('Some structured data &mdash; partial product discovery via schema markup');
  } else {
    score += 5;
    blockers.push('Limited structured data &mdash; Playwright must rely on visual/DOM heuristics to find products');
  }

  // Low checkout steps make the flow shorter (+15)
  if (m.checkout >= 70) {
    score += 15;
    reasons.push('Low step count &mdash; fewer pages for Playwright to navigate through');
  } else if (m.checkout >= 50) {
    score += 8;
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine verdict
  let verdict: string;
  let color: string;
  let strategy: string;

  if (score >= 80) {
    verdict = 'Excellent';
    color = '#10B981';
    strategy = `Playwright can likely complete a full checkout flow on <code>${m.domain}</code>. Use <code>page.goto()</code> → find product via JSON-LD → click add-to-cart → fill guest checkout form → submit order. Consider recording the flow with <code>codegen</code> first.`;
  } else if (score >= 60) {
    verdict = 'Good';
    color = '#3B82F6';
    strategy = `Playwright checkout is feasible with some work. Build a targeted script: navigate → search/browse products → add to cart → attempt guest checkout. May need to handle dynamic content loading with <code>waitForSelector</code>.`;
  } else if (score >= 40) {
    verdict = 'Possible';
    color = '#F59E0B';
    strategy = `Playwright could work but expect friction. ${blockers.length > 0 ? 'Key challenges: ' + blockers[0] + '.' : ''} Use stealth plugins (<code>playwright-extra</code>) and headful mode. Consider a hybrid approach: Playwright for discovery, manual for payment.`;
  } else if (score >= 20) {
    verdict = 'Difficult';
    color = '#F97316';
    strategy = `Playwright automation will face significant obstacles. ${blockers.length > 0 ? blockers.join('. ') + '.' : ''} Better approach: use the Sly Traffic Monitor snippet to prove agent demand, then pitch UCP integration directly.`;
  } else {
    verdict = 'Not Recommended';
    color = '#EF4444';
    strategy = `Browser automation is not viable here. Focus on outreach: install the Sly Traffic Monitor to demonstrate AI agent demand, then work with the merchant to adopt UCP/ACP protocols.`;
  }

  return { verdict, color, score, reasons, blockers, strategy };
}

function analyzeCheckoutTest(m: Merchant): { approach: string; steps: string[]; ucpEndpoint: string; difficulty: string } {
  const steps: string[] = [];
  let approach = '';
  let ucpEndpoint = '';
  let difficulty = '';

  if (m.protocol >= 16) {
    // Has UCP
    ucpEndpoint = `https://${m.domain}/.well-known/ucp`;
    approach = 'UCP Discovery + Agent Checkout';
    difficulty = 'Low';
    steps.push(`Fetch <code>${ucpEndpoint}</code> to discover checkout capabilities`);
    steps.push('Parse UCP manifest for supported payment methods and cart API');
    steps.push('Use Sly <code>ucp_discover</code> + <code>ucp_create_checkout</code> to create a test session');
    steps.push('Add a low-value item to cart via the UCP cart API');
    steps.push('Complete checkout with Sly USDC payment instrument (sandbox mode)');
    if (m.region === 'latam') {
      steps.push('Verify Pix settlement path for BRL conversion');
    }
  } else if (m.data >= 60 && m.checkout >= 60) {
    // Good data + good checkout = structured scraping approach
    approach = 'Structured Data Scraping + Guest Checkout';
    difficulty = 'Medium';
    steps.push(`Browse <code>https://${m.domain}</code> and parse JSON-LD product data`);
    steps.push('Identify product catalog via Schema.org Product/Offer markup');
    steps.push('Select a low-value item and extract the Add to Cart endpoint');
    steps.push('Attempt guest checkout flow (no account required based on checkout score)');
    steps.push('Test payment form discovery &mdash; check for Stripe/PayPal/Adyen integration');
    steps.push('Note: Full agent checkout requires UCP/ACP integration (not yet available on this site)');
  } else if (m.data >= 60) {
    // Good data but checkout friction
    approach = 'Data Discovery + Manual Checkout Audit';
    difficulty = 'Medium-High';
    steps.push(`Scrape structured data from <code>https://${m.domain}</code>`);
    steps.push('Catalog available products via JSON-LD/microdata');
    steps.push('Manually audit checkout flow for friction points (account required? CAPTCHA? steps?)');
    steps.push('Document payment processors detected (for future Sly integration)');
    steps.push('Recommend UCP integration to merchant for agent-ready checkout');
  } else if (m.checkout >= 60) {
    // Low data but smooth checkout
    approach = 'Agent Browsing + Low-Friction Checkout';
    difficulty = 'Medium';
    steps.push(`Browse <code>https://${m.domain}</code> with Claude/GPT agent`);
    steps.push('Use visual/HTML parsing to find products (limited structured data)');
    steps.push('Leverage low checkout friction &mdash; guest checkout should be available');
    steps.push('Test add-to-cart and checkout initiation');
    steps.push('Recommend structured data improvements to merchant for better agent discovery');
  } else {
    // Low everything except maybe accessibility
    approach = 'Accessibility Audit + Outreach';
    difficulty = 'High';
    steps.push(`Verify site accessibility at <code>https://${m.domain}/robots.txt</code>`);
    steps.push('Audit for bot-blocking, CAPTCHA, and JavaScript requirements');
    steps.push('Document current checkout friction points');
    steps.push('This merchant needs both data enrichment and protocol integration');
    steps.push('Best approach: sales outreach with Sly Traffic Monitor snippet to prove agent demand');
  }

  return { approach, steps, ucpEndpoint, difficulty };
}

// Generate accordion card for a top prospect
function prospectAccordion(m: Merchant, rank: number): string {
  const proto = analyzeProtocols(m);
  const reasons = analyzeWhyHighScore(m);
  const test = analyzeCheckoutTest(m);
  const pw = analyzePlaywright(m);
  const regionLabel = regionLabels[m.region] || m.region || 'Unknown';
  const regionColor = regionColors[m.region] || '#6B7280';

  const difficultyColor = test.difficulty === 'Low' ? '#10B981' : test.difficulty === 'Medium' ? '#F59E0B' : test.difficulty === 'Medium-High' ? '#F97316' : '#EF4444';

  return `<details>
  <summary>
    <div class="sum-rank">#${rank}</div>
    <div class="sum-name">${esc(m.name || m.domain)}</div>
    <div class="sum-domain">${esc(m.domain)}</div>
    <span class="region-tag sum-region" style="background:${regionColor}20;color:${regionColor};">${regionLabel}</span>
    <div class="sum-score">${badge(m.score)}</div>
  </summary>
  <div class="dive-body">

    <!-- Score breakdown bars -->
    <div class="score-mini-bars">
      <div class="mini-bar-row">
        <div class="mini-bar-label">Protocol</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${Math.max(m.protocol, 3)}%;background:#8B5CF6;">${m.protocol}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
      <div class="mini-bar-row">
        <div class="mini-bar-label">Data</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${m.data}%;background:#3B82F6;">${m.data}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
      <div class="mini-bar-row">
        <div class="mini-bar-label">Accessibility</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${m.accessibility}%;background:#10B981;">${m.accessibility}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
      <div class="mini-bar-row">
        <div class="mini-bar-label">Checkout</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${m.checkout}%;background:#F59E0B;">${m.checkout}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
    </div>

    <div class="dive-grid">
      <!-- Why they scored high -->
      <div class="dive-card" style="border-left: 3px solid var(--sly-purple);">
        <h5>Why This Score?</h5>
        <ul>
${reasons.map(r => `          <li>${r}</li>`).join('\n')}
        </ul>
      </div>

      <!-- Protocol detection -->
      <div class="dive-card" style="border-left: 3px solid #8B5CF6;">
        <h5>Protocols Detected</h5>
        <p style="margin-bottom:10px;">${proto.tags}</p>
        <p>${proto.summary}</p>
        <ul>
${proto.details.map(d => `          <li>${d}</li>`).join('\n')}
        </ul>
      </div>
    </div>

    <!-- Playwright automability -->
    <div class="playwright-card" style="border-left-color:${pw.color};">
      <h5>Playwright Automability <span class="pw-verdict" style="background:${pw.color}15;color:${pw.color};">${pw.verdict}</span> <span class="pw-score">${pw.score}/100</span></h5>
      <div class="pw-meter"><div class="pw-meter-fill" style="width:${Math.max(pw.score, 3)}%;background:${pw.color};"></div></div>
${pw.reasons.length > 0 ? `      <div class="pw-signals">
        <div class="pw-signal-label" style="color:#065F46;">Favorable signals:</div>
        <ul>${pw.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>` : ''}
${pw.blockers.length > 0 ? `      <div class="pw-signals">
        <div class="pw-signal-label" style="color:#991B1B;">Blockers:</div>
        <ul style="color:#991B1B;">${pw.blockers.map(b => `<li>${b}</li>`).join('')}</ul>
      </div>` : ''}
      <div class="pw-strategy">
        <strong>Strategy:</strong> ${pw.strategy}
      </div>
    </div>

    <!-- Checkout test plan -->
    <div class="checkout-test">
      <h5>How to Test a Checkout <span style="font-weight:400;margin-left:8px;">Difficulty: <span style="color:${difficultyColor};font-weight:700;">${test.difficulty}</span></span></h5>
      <p style="font-weight:600;margin-bottom:8px;">Approach: ${test.approach}</p>
      <ol style="padding-left:18px;font-size:13px;color:var(--gray-700);">
${test.steps.map(s => `        <li style="margin-bottom:4px;">${s}</li>`).join('\n')}
      </ol>
${m.protocol > 0 ? `      <div class="endpoint-validate" style="margin-top:12px;">
        <button class="validate-btn" onclick="fetchEndpoint(this, '${esc(m.domain)}', 'ucp')">
          <span class="validate-icon">&#9654;</span> Fetch /.well-known/ucp
        </button>
${m.protocol < 16 ? `        <button class="validate-btn validate-btn-alt" onclick="fetchEndpoint(this, '${esc(m.domain)}', 'acp')" style="margin-left:6px;">
          <span class="validate-icon">&#9654;</span> Fetch /.well-known/acp
        </button>` : ''}
        <button class="validate-btn" style="margin-left:6px;border-color:#06B6D4;color:#0E7490;" onclick="fetchEndpoint(this, '${esc(m.domain)}', 'nlweb')">
          <span class="validate-icon">&#9654;</span> Fetch /.well-known/nlweb
        </button>
        <div class="endpoint-result" style="display:none;"></div>
      </div>` : ''}
    </div>

  </div>
</details>`;
}

// NLWeb merchant accordion
function nlwebAccordion(m: Merchant, rank: number): string {
  const regionLabel = regionLabels[m.region] || m.region || 'Unknown';
  const regionColor = regionColors[m.region] || '#6B7280';

  return `<details>
  <summary>
    <div class="sum-rank">#${rank}</div>
    <div class="sum-name">${esc(m.name || m.domain)}</div>
    <div class="sum-domain">${esc(m.domain)}</div>
    <span class="region-tag sum-region" style="background:${regionColor}20;color:${regionColor};">${regionLabel}</span>
    <span class="proto-tag proto-signal">NLWeb</span>
    <span class="proto-tag proto-unverified">Unverified</span>
    <div class="sum-score">${badge(m.score)}</div>
  </summary>
  <div class="dive-body">

    <div class="score-mini-bars">
      <div class="mini-bar-row">
        <div class="mini-bar-label">Protocol</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${Math.max(m.protocol, 3)}%;background:#8B5CF6;">${m.protocol}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
      <div class="mini-bar-row">
        <div class="mini-bar-label">Data</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${m.data}%;background:#3B82F6;">${m.data}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
      <div class="mini-bar-row">
        <div class="mini-bar-label">Accessibility</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${m.accessibility}%;background:#10B981;">${m.accessibility}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
      <div class="mini-bar-row">
        <div class="mini-bar-label">Checkout</div>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${m.checkout}%;background:#F59E0B;">${m.checkout}</div></div>
        <div class="mini-bar-val">/100</div>
      </div>
    </div>

    <div class="dive-grid">
      <div class="dive-card" style="border-left: 3px solid #06B6D4;">
        <h5>What is NLWeb?</h5>
        <p>NLWeb is Microsoft's protocol that lets AI agents query a website using <strong>natural language</strong> instead of scraping HTML.</p>
        <p>The agent sends a question like <em>"show me electronics under $50"</em> and the site returns structured results &mdash; like a conversational search API.</p>
        <ul>
          <li>Endpoint: <code>/.well-known/nlweb</code></li>
          <li>Returns a JSON manifest describing supported queries</li>
          <li>Agents use it for <strong>product discovery</strong> (not checkout)</li>
          <li>Complements UCP/ACP &mdash; NLWeb finds products, UCP buys them</li>
        </ul>
      </div>
      <div class="dive-card" style="border-left: 3px solid #8B5CF6;">
        <h5>How to Test</h5>
        <ol style="padding-left:16px;font-size:13px;color:var(--gray-700);">
          <li style="margin-bottom:4px;">Fetch <code>https://${esc(m.domain)}/.well-known/nlweb</code> to get the manifest</li>
          <li style="margin-bottom:4px;">Check for <code>query_endpoint</code> in the response JSON</li>
          <li style="margin-bottom:4px;">POST a natural language query to the endpoint:<br><code style="margin-top:4px;">{"query": "what products do you sell?"}</code></li>
          <li style="margin-bottom:4px;">Verify the response contains structured product data</li>
          <li style="margin-bottom:4px;">Try specific queries: <code>"cheapest item"</code>, <code>"items under $20"</code></li>
        </ol>
      </div>
    </div>

    <div class="endpoint-validate" style="margin-top:12px;">
      <button class="validate-btn" style="border-color:#06B6D4;color:#0E7490;" onclick="fetchEndpoint(this, '${esc(m.domain)}', 'nlweb')">
        <span class="validate-icon">&#9654;</span> Fetch /.well-known/nlweb
      </button>
      <div class="endpoint-result" style="display:none;"></div>
    </div>

  </div>
</details>`;
}

// --- HTML Generation ---
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Build table rows for a filtered set
function protocolLevel(m: Merchant): string {
  if (m.protocol >= 26) return 'ucp_confirmed';
  if (m.protocol >= 16) return 'ucp_unverified';
  if (m.protocol >= 10) return 'acp_unverified';
  if (m.protocol >= 5) return 'nlweb';
  if (m.protocol > 0) return 'signal';
  return 'none';
}

function playwrightLevel(m: Merchant): string {
  if (m.protocol >= 16) return 'not_needed';
  const pw = analyzePlaywright(m);
  if (pw.score >= 80) return 'excellent';
  if (pw.score >= 60) return 'good';
  if (pw.score >= 40) return 'possible';
  if (pw.score >= 20) return 'difficult';
  return 'not_recommended';
}

function merchantRows(ms: Merchant[]): string {
  return ms.map(m => {
    const size = guessSize(m);
    const proto = getProtocolTags(m);
    const highlight = proto || (m.category || '');
    const pLevel = protocolLevel(m);
    const pwLevel = playwrightLevel(m);
    return `    <tr data-company="${esc(m.name)}" data-domain="${esc(m.domain)}" data-country="${esc(m.country)}" data-region="${esc(m.region)}" data-score="${m.score}" data-segment="${esc(m.category)}" data-size="${size}" data-protocol="${pLevel}" data-playwright="${pwLevel}"><td><strong>${esc(m.name)}</strong></td><td><a href="https://${esc(m.domain)}" target="_blank" style="color:#3B82F6;text-decoration:none;font-size:12px;">${esc(m.domain)}</a></td><td>${esc(m.country)}</td><td>${badge(m.score)}</td><td>${highlight}</td></tr>`;
  }).join('\n');
}

// Stacked bar for a region
function stackedBar(label: string, ms: Merchant[], color: string): string {
  const a = ms.filter(m => m.score >= 40).length;
  const b = ms.filter(m => m.score >= 30 && m.score < 40).length;
  const c = ms.filter(m => m.score >= 25 && m.score < 30).length;
  const d = ms.filter(m => m.score >= 20 && m.score < 25).length;
  const f = ms.filter(m => m.score < 20).length;
  const t = ms.length;
  const pct = (n: number) => Math.max(n / t * 100, n > 0 ? 2 : 0);
  return `    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track">
        <div class="stacked-bar">
          ${a > 0 ? `<div class="segment" style="width:${pct(a)}%;background:#10B981;" title="Grade A: ${a}">${a}</div>` : ''}
          ${b > 0 ? `<div class="segment" style="width:${pct(b)}%;background:#3B82F6;" title="Grade B: ${b}">${b}</div>` : ''}
          ${c > 0 ? `<div class="segment" style="width:${pct(c)}%;background:#F59E0B;" title="Grade C: ${c}">${c}</div>` : ''}
          ${d > 0 ? `<div class="segment" style="width:${pct(d)}%;background:#EF4444;" title="Grade D: ${d}">${d}</div>` : ''}
          ${f > 0 ? `<div class="segment" style="width:${pct(f)}%;background:#6B7280;" title="Grade F: ${f}">${f}</div>` : ''}
        </div>
      </div>
      <div class="bar-value">${t}</div>
    </div>`;
}

// Top 5 per region
function regionTop5(r: RegionStats): string {
  const top = r.merchants.sort((a, b) => b.score - a.score).slice(0, 5);
  const label = regionLabels[r.name] || r.name;
  return `<h3>${label} — Top 5</h3>
<table>
  <thead><tr><th>#</th><th>Company</th><th>Country</th><th>Category</th><th>Score</th></tr></thead>
  <tbody>
${top.map((m, i) => `    <tr><td>${i + 1}</td><td><strong>${esc(m.name)}</strong></td><td>${esc(m.country)}</td><td>${m.category}</td><td>${badge(m.score)}</td></tr>`).join('\n')}
  </tbody>
</table>`;
}

// Category section with all merchants
function categorySection(cat: CatStats): string {
  const label = catLabels[cat.name] || cat.name;
  const color = catColors[cat.name] || '#6B7280';
  const sorted = cat.merchants.sort((a, b) => b.score - a.score);
  return `<h3 style="color:${color};">${label} <span style="font-size:14px;font-weight:normal;">(${cat.count} companies, avg ${cat.avg})</span></h3>
<table>
  <thead><tr><th>Company</th><th>URL</th><th>Country</th><th>Score</th><th>Highlights</th></tr></thead>
  <tbody>
${merchantRows(sorted)}
  </tbody>
</table>`;
}

// --- Assemble HTML ---
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sly Scanner Report — Q1 2026 Baseline (1,000 Merchants)</title>
<style>
  :root {
    --sly-purple: #7C3AED;
    --sly-purple-light: #A78BFA;
    --sly-purple-bg: #F5F3FF;
    --sly-dark: #1E1B4B;
    --green: #10B981;
    --green-light: #D1FAE5;
    --blue: #3B82F6;
    --blue-light: #DBEAFE;
    --orange: #F59E0B;
    --orange-light: #FEF3C7;
    --red: #EF4444;
    --red-light: #FEE2E2;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
    --gray-300: #D1D5DB;
    --gray-500: #6B7280;
    --gray-700: #374151;
    --gray-900: #111827;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--gray-900);
    background: #fff;
    line-height: 1.6;
  }
  .page { max-width: 100%; margin: 0 auto; padding: 40px 60px; }
  .cover {
    background: linear-gradient(135deg, var(--sly-dark) 0%, var(--sly-purple) 100%);
    color: #fff;
    padding: 80px 60px;
    border-radius: 16px;
    margin-bottom: 48px;
    position: relative;
    overflow: hidden;
  }
  .cover::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 500px;
    height: 500px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
  }
  .cover .logo { font-size: 18px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; opacity: 0.7; margin-bottom: 24px; }
  .cover h1 { font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 16px; }
  .cover .subtitle { font-size: 20px; opacity: 0.85; margin-bottom: 32px; }
  .cover .meta { display: flex; gap: 32px; font-size: 14px; opacity: 0.65; }
  .cover .meta span { display: flex; align-items: center; gap: 6px; }
  h2 {
    font-size: 28px;
    font-weight: 700;
    color: var(--sly-dark);
    margin: 48px 0 24px;
    padding-bottom: 12px;
    border-bottom: 3px solid var(--sly-purple);
    display: inline-block;
  }
  h3 { font-size: 20px; font-weight: 600; color: var(--gray-700); margin: 32px 0 16px; }
  h4 { font-size: 16px; font-weight: 600; color: var(--gray-700); margin: 16px 0 8px; }
  p { color: var(--gray-700); margin-bottom: 12px; }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin: 24px 0;
  }
  .kpi {
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  }
  .kpi .value { font-size: 36px; font-weight: 800; color: var(--sly-purple); }
  .kpi .label { font-size: 13px; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  .kpi.green .value { color: var(--green); }
  .kpi.blue .value { color: var(--blue); }
  .kpi.orange .value { color: var(--orange); }
  .chart-container { margin: 24px 0; }
  .bar-chart { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: flex; align-items: center; gap: 12px; }
  .bar-label { width: 120px; font-size: 13px; font-weight: 600; color: var(--gray-700); text-align: right; flex-shrink: 0; }
  .bar-track { flex: 1; height: 32px; background: var(--gray-100); border-radius: 8px; overflow: hidden; position: relative; }
  .bar-fill { height: 100%; border-radius: 8px; display: flex; align-items: center; padding: 0 10px; font-size: 12px; font-weight: 700; color: #fff; min-width: 40px; transition: width 0.5s ease; }
  .bar-value { font-size: 13px; font-weight: 600; color: var(--gray-700); width: 60px; flex-shrink: 0; }
  .stacked-bar { display: flex; height: 32px; border-radius: 8px; overflow: hidden; }
  .stacked-bar .segment { display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; min-width: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  thead th { background: var(--sly-dark); color: #fff; padding: 12px 16px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 8px 0 0 0; }
  thead th:last-child { border-radius: 0 8px 0 0; }
  tbody td { padding: 10px 16px; border-bottom: 1px solid var(--gray-100); }
  tbody tr:hover { background: var(--sly-purple-bg); }
  tbody tr:last-child td:first-child { border-radius: 0 0 0 8px; }
  tbody tr:last-child td:last-child { border-radius: 0 0 8px 0; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
  .badge-a { background: #D1FAE5; color: #065F46; }
  .badge-b { background: #DBEAFE; color: #1E40AF; }
  .badge-c { background: #FEF3C7; color: #92400E; }
  .badge-d { background: #FEE2E2; color: #991B1B; }
  .badge-f { background: var(--gray-200); color: var(--gray-700); }
  .proto-tag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; margin: 1px 2px; }
  .proto-confirmed { background: #D1FAE5; color: #065F46; }
  .proto-enabled { background: #DBEAFE; color: #1E40AF; }
  .proto-signal { background: #FEF3C7; color: #92400E; }
  .proto-none { background: var(--gray-100); color: var(--gray-500); }
  .proto-unverified { background: #FEF3C7; color: #92400E; border: 1px dashed #F59E0B; }
  .score-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
  .score-card {
    border: 1px solid var(--gray-200);
    border-radius: 12px;
    padding: 24px;
    border-left: 4px solid var(--sly-purple);
  }
  .score-card.protocol { border-left-color: #8B5CF6; }
  .score-card.data { border-left-color: #3B82F6; }
  .score-card.access { border-left-color: #10B981; }
  .score-card.checkout { border-left-color: #F59E0B; }
  .score-card h4 { margin-top: 0; }
  .score-card .weight { font-size: 13px; color: var(--gray-500); margin-bottom: 8px; }
  .score-card ul { padding-left: 18px; font-size: 13px; color: var(--gray-700); }
  .score-card li { margin-bottom: 4px; }
  .strategy-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 24px 0; }
  .strategy-card {
    background: linear-gradient(135deg, var(--gray-50), #fff);
    border: 1px solid var(--gray-200);
    border-radius: 12px;
    padding: 24px;
  }
  .strategy-card .icon { font-size: 28px; margin-bottom: 12px; }
  .strategy-card h4 { margin: 0 0 8px; color: var(--sly-dark); }
  .strategy-card p { font-size: 13px; color: var(--gray-700); }
  .highlight {
    background: var(--sly-purple-bg);
    border: 1px solid var(--sly-purple-light);
    border-radius: 12px;
    padding: 24px;
    margin: 24px 0;
  }
  .highlight.green { background: var(--green-light); border-color: var(--green); }
  .highlight.orange { background: var(--orange-light); border-color: var(--orange); }
  .highlight strong { color: var(--sly-dark); }
  .region-tag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
  .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--gray-200); font-size: 12px; color: var(--gray-500); display: flex; justify-content: space-between; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .filter-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--gray-200);
    padding: 14px 24px;
    margin: 0 -48px 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .filter-bar label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--gray-500);
    margin-right: -4px;
  }
  .filter-bar input[type="text"] {
    padding: 7px 12px;
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    font-size: 13px;
    width: 180px;
    outline: none;
    transition: border-color 0.2s;
  }
  .filter-bar input[type="text"]:focus {
    border-color: var(--sly-purple);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
  }
  .filter-bar select {
    padding: 7px 10px;
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    font-size: 13px;
    background: #fff;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  }
  .filter-bar select:focus {
    border-color: var(--sly-purple);
    box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
  }
  .filter-bar .filter-reset {
    padding: 7px 14px;
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    background: var(--gray-50);
    cursor: pointer;
    color: var(--gray-700);
    transition: all 0.2s;
  }
  .filter-bar .filter-reset:hover {
    background: var(--sly-purple-bg);
    border-color: var(--sly-purple-light);
    color: var(--sly-purple);
  }
  .filter-count {
    font-size: 12px;
    color: var(--gray-500);
    margin-left: auto;
    font-weight: 600;
  }
  .filter-count strong {
    color: var(--sly-purple);
  }
  .filter-hidden { display: none !important; }
  .section-hidden { display: none !important; }

  /* Accordion / Details */
  .prospect-accordion { margin: 8px 0; }
  .prospect-accordion details {
    border: 1px solid var(--gray-200);
    border-radius: 12px;
    margin-bottom: 12px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }
  .prospect-accordion details[open] {
    box-shadow: 0 4px 20px rgba(124,58,237,0.10);
    border-color: var(--sly-purple-light);
  }
  .prospect-accordion summary {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    cursor: pointer;
    list-style: none;
    user-select: none;
    background: var(--gray-50);
    transition: background 0.2s;
  }
  .prospect-accordion summary::-webkit-details-marker { display: none; }
  .prospect-accordion summary::before {
    content: '';
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E") center/contain no-repeat;
    transition: transform 0.2s;
  }
  .prospect-accordion details[open] summary::before { transform: rotate(180deg); }
  .prospect-accordion details[open] summary { background: var(--sly-purple-bg); }
  .prospect-accordion summary:hover { background: var(--sly-purple-bg); }
  .prospect-accordion .sum-rank { font-size: 14px; font-weight: 800; color: var(--sly-purple); width: 28px; text-align: center; flex-shrink: 0; }
  .prospect-accordion .sum-name { font-weight: 700; font-size: 15px; color: var(--sly-dark); flex: 1; }
  .prospect-accordion .sum-domain { font-size: 12px; color: var(--blue); flex-shrink: 0; }
  .prospect-accordion .sum-region { flex-shrink: 0; }
  .prospect-accordion .sum-score { flex-shrink: 0; }
  .prospect-accordion .dive-body { padding: 0 20px 20px; }
  .prospect-accordion .dive-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
  .prospect-accordion .dive-card {
    border: 1px solid var(--gray-200);
    border-radius: 10px;
    padding: 16px;
  }
  .prospect-accordion .dive-card h5 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--gray-500);
    margin: 0 0 10px;
  }
  .prospect-accordion .dive-card p { font-size: 13px; margin-bottom: 6px; }
  .prospect-accordion .dive-card ul { padding-left: 16px; font-size: 13px; color: var(--gray-700); margin: 0; }
  .prospect-accordion .dive-card li { margin-bottom: 3px; }
  .prospect-accordion .score-mini-bars { margin-top: 12px; }
  .prospect-accordion .mini-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .prospect-accordion .mini-bar-label { width: 90px; font-size: 12px; font-weight: 600; color: var(--gray-700); text-align: right; }
  .prospect-accordion .mini-bar-track { flex: 1; height: 18px; background: var(--gray-100); border-radius: 6px; overflow: hidden; }
  .prospect-accordion .mini-bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding: 0 6px; font-size: 10px; font-weight: 700; color: #fff; min-width: 24px; }
  .prospect-accordion .mini-bar-val { width: 32px; font-size: 12px; font-weight: 600; color: var(--gray-700); }
  .prospect-accordion .playwright-card {
    margin-top: 16px;
    background: linear-gradient(135deg, #EFF6FF, #F0F9FF);
    border: 1px solid #93C5FD;
    border-left: 4px solid #3B82F6;
    border-radius: 10px;
    padding: 16px;
  }
  .prospect-accordion .playwright-card h5 {
    color: #1E3A5F;
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 10px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .prospect-accordion .pw-verdict {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    text-transform: none;
    letter-spacing: 0;
  }
  .prospect-accordion .pw-score {
    font-size: 12px;
    font-weight: 700;
    color: var(--gray-500);
    text-transform: none;
    letter-spacing: 0;
  }
  .prospect-accordion .pw-meter {
    height: 8px;
    background: var(--gray-200);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .prospect-accordion .pw-meter-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
  }
  .prospect-accordion .pw-signals {
    margin-bottom: 8px;
  }
  .prospect-accordion .pw-signal-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }
  .prospect-accordion .pw-signals ul {
    padding-left: 16px;
    font-size: 13px;
    margin: 0;
    color: var(--gray-700);
  }
  .prospect-accordion .pw-signals li { margin-bottom: 2px; }
  .prospect-accordion .pw-strategy {
    margin-top: 10px;
    padding: 10px 12px;
    background: rgba(255,255,255,0.7);
    border-radius: 8px;
    font-size: 13px;
    color: var(--gray-700);
    line-height: 1.5;
  }
  .prospect-accordion .pw-strategy code {
    display: inline-block;
    background: #DBEAFE;
    border: 1px solid #93C5FD;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 12px;
    font-family: 'SF Mono', Monaco, monospace;
    color: #1E40AF;
  }
  .prospect-accordion .checkout-test {
    margin-top: 16px;
    background: linear-gradient(135deg, #F0FDF4, #ECFDF5);
    border: 1px solid #86EFAC;
    border-radius: 10px;
    padding: 16px;
  }
  .prospect-accordion .checkout-test h5 { color: #065F46; }
  .prospect-accordion .checkout-test code {
    display: inline-block;
    background: #fff;
    border: 1px solid #BBF7D0;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 12px;
    font-family: 'SF Mono', Monaco, monospace;
    color: #065F46;
  }
  .validate-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border: 1px solid #86EFAC;
    border-radius: 8px;
    background: #fff;
    color: #065F46;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'SF Mono', Monaco, monospace;
  }
  .validate-btn:hover { background: #D1FAE5; border-color: #10B981; }
  .validate-btn:active { transform: scale(0.97); }
  .validate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .validate-btn-alt { border-color: #93C5FD; color: #1E40AF; }
  .validate-btn-alt:hover { background: #DBEAFE; border-color: #3B82F6; }
  .validate-icon { font-size: 10px; }
  .endpoint-result {
    margin-top: 10px;
    border-radius: 8px;
    overflow: hidden;
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 12px;
    line-height: 1.5;
  }
  .endpoint-result .ep-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .endpoint-result .ep-header.ep-ok { background: #D1FAE5; color: #065F46; }
  .endpoint-result .ep-header.ep-fail { background: #FEE2E2; color: #991B1B; }
  .endpoint-result .ep-header.ep-cors { background: #FEF3C7; color: #92400E; }
  .endpoint-result .ep-body {
    padding: 10px 12px;
    background: #1E1B4B;
    color: #E2E8F0;
    max-height: 300px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  @media print {
    .filter-bar { display: none !important; }
    .page { padding: 20px; }
    .cover { padding: 40px; }
    h2 { break-before: auto; }
    table { font-size: 11px; }
  }
</style>
</head>
<body>
<div class="page">

<!-- COVER -->
<div class="cover">
  <div class="logo">Sly Intelligence</div>
  <h1>State of Agentic Commerce<br>Q1 2026 Baseline</h1>
  <div class="subtitle">${total.toLocaleString()} Merchants Scanned Across ${regions.length} Regions &amp; ${categories.length} Categories</div>
  <div class="meta">
    <span>February 19, 2026</span>
    <span>Scanner v2</span>
    <span>8 Protocols Probed</span>
    <span>Sly Intelligence</span>
  </div>
</div>

<!-- INTERACTIVE FILTERS -->
<div class="filter-bar" id="filterBar">
  <label for="filter-search">Search</label>
  <input type="text" id="filter-search" placeholder="Company or domain...">

  <label for="filter-region">Region</label>
  <select id="filter-region">
    <option value="">All Regions</option>
${regions.map(r => `    <option value="${r.name}">${regionLabels[r.name] || r.name}</option>`).join('\n')}
  </select>

  <label for="filter-score">Score</label>
  <select id="filter-score">
    <option value="">All Scores</option>
    <option value="a">A (40+)</option>
    <option value="b">B (30-39)</option>
    <option value="c">C (25-29)</option>
    <option value="d">D (20-24)</option>
    <option value="f">F (&lt;20)</option>
  </select>

  <label for="filter-segment">Category</label>
  <select id="filter-segment">
    <option value="">All Categories</option>
${categories.map(c => `    <option value="${c.name}">${catLabels[c.name] || c.name} (${c.count})</option>`).join('\n')}
  </select>

  <label for="filter-protocol">Protocol</label>
  <select id="filter-protocol">
    <option value="">All</option>
    <option value="any">Any Signal</option>
    <option value="ucp_confirmed">UCP Confirmed</option>
    <option value="ucp_unverified">UCP (Unverified)</option>
    <option value="acp_unverified">ACP (Unverified)</option>
    <option value="nlweb">NLWeb</option>
    <option value="none">None</option>
  </select>

  <label for="filter-playwright">Playwright</label>
  <select id="filter-playwright">
    <option value="">All</option>
    <option value="excellent">Excellent (80+)</option>
    <option value="good">Good (60-79)</option>
    <option value="possible">Possible (40-59)</option>
    <option value="difficult">Difficult (20-39)</option>
    <option value="automatable">All Automatable (40+)</option>
    <option value="not_needed">Not Needed (has protocol)</option>
  </select>

  <button class="filter-reset" onclick="resetFilters()">Reset</button>
  <div class="filter-count" id="filterCount">Showing <strong>all</strong> companies</div>
</div>

<!-- EXECUTIVE SUMMARY -->
<h2>Executive Summary</h2>
<p>We scanned <strong>${total.toLocaleString()} merchants</strong> across ${regions.length} regions and ${categories.length} categories to assess their readiness for agentic commerce &mdash; AI agents autonomously browsing, comparing, and purchasing on behalf of consumers. The market is <strong>early-stage</strong>: only ${protocolMerchants.length} merchants have any protocol signals, but the infrastructure foundation (${avgAccess}/100 accessibility) is already in place.</p>

<div class="kpi-grid">
  <div class="kpi"><div class="value">${total.toLocaleString()}</div><div class="label">Merchants Scanned</div></div>
  <div class="kpi blue"><div class="value">${avgScore}</div><div class="label">Avg Readiness Score</div></div>
  <div class="kpi green"><div class="value">${gradeA.length}</div><div class="label">Grade A (40+)</div></div>
  <div class="kpi orange"><div class="value">${protocolMerchants.length}</div><div class="label">Protocol Signals</div></div>
</div>

<div class="highlight">
  <strong>Key Takeaway:</strong> The agentic commerce protocol layer is virtually non-existent &mdash; average protocol score is just ${avgProtocol}/100. However, ${avgAccess}% average accessibility and growing structured data adoption mean the foundation is ready. Companies just need the protocol layer activated. This is Sly's opportunity as an enablement partner.
</div>

<!-- HOW SCORES WORK -->
<h2>How Readiness Scores Work</h2>
<p>Each merchant receives a composite <strong>Readiness Score (0&ndash;100)</strong> computed as a weighted average of four component scores:</p>

<div class="score-cards">
  <div class="score-card protocol">
    <h4>Protocol Score <span style="color:var(--gray-500);font-weight:400">(30% weight)</span></h4>
    <div class="weight">Measures agentic commerce protocol support</div>
    <ul>
      <li><strong>UCP</strong> &mdash; 30 pts confirmed</li>
      <li><strong>ACP</strong> &mdash; 20 pts confirmed</li>
      <li><strong>MCP</strong> &mdash; 15 pts confirmed</li>
      <li><strong>x402 / AP2</strong> &mdash; 10 pts each</li>
      <li><strong>NLWeb / Visa VIC / Mastercard</strong> &mdash; 5 pts each</li>
    </ul>
  </div>
  <div class="score-card data">
    <h4>Data Score <span style="color:var(--gray-500);font-weight:400">(25% weight)</span></h4>
    <div class="weight">Evaluates structured data quality for agent parsing</div>
    <ul>
      <li><strong>JSON-LD</strong> present &mdash; +25 pts</li>
      <li><strong>Schema Product/Offer</strong> &mdash; +15-20 pts</li>
      <li><strong>OpenGraph</strong> metadata &mdash; +10 pts</li>
      <li>Product attribute completeness &mdash; up to +30 pts</li>
    </ul>
  </div>
  <div class="score-card access">
    <h4>Accessibility Score <span style="color:var(--gray-500);font-weight:400">(20% weight)</span></h4>
    <div class="weight">How bot-friendly is the site? (starts at 100, deducts)</div>
    <ul>
      <li>Blocks all bots &mdash; <strong>-40 pts</strong></li>
      <li>Has CAPTCHA &mdash; <strong>-25 pts</strong></li>
      <li>Requires JavaScript &mdash; <strong>-15 pts</strong></li>
      <li>Blocks GPTBot/ClaudeBot &mdash; <strong>-10 pts each</strong></li>
    </ul>
  </div>
  <div class="score-card checkout">
    <h4>Checkout Score <span style="color:var(--gray-500);font-weight:400">(25% weight)</span></h4>
    <div class="weight">Payment friction and method diversity</div>
    <ul>
      <li>Guest checkout &mdash; <strong>+30 pts</strong></li>
      <li>No account required &mdash; <strong>+20 pts</strong></li>
      <li>Low checkout steps &mdash; +15-25 pts</li>
      <li>3+ payment processors &mdash; +10 pts</li>
    </ul>
  </div>
</div>

<h3>Grade Ranges</h3>
<table>
  <thead>
    <tr><th>Grade</th><th>Score</th><th>Meaning</th><th>Count</th><th>% of Total</th></tr>
  </thead>
  <tbody>
    <tr><td><span class="badge badge-a">A</span></td><td>40&ndash;100</td><td>Agent-Ready &mdash; confirmed protocols, rich data, frictionless checkout</td><td>${gradeA.length}</td><td>${(gradeA.length / total * 100).toFixed(1)}%</td></tr>
    <tr><td><span class="badge badge-b">B</span></td><td>30&ndash;39</td><td>Partially Ready &mdash; good infrastructure, some protocol signals</td><td>${gradeB.length}</td><td>${(gradeB.length / total * 100).toFixed(1)}%</td></tr>
    <tr><td><span class="badge badge-c">C</span></td><td>25&ndash;29</td><td>Basic Support &mdash; accessible but no protocols, limited data</td><td>${gradeC.length}</td><td>${(gradeC.length / total * 100).toFixed(1)}%</td></tr>
    <tr><td><span class="badge badge-d">D</span></td><td>20&ndash;24</td><td>Minimal &mdash; no protocols, sparse data, some friction</td><td>${gradeD.length}</td><td>${(gradeD.length / total * 100).toFixed(1)}%</td></tr>
    <tr><td><span class="badge badge-f">F</span></td><td>0&ndash;19</td><td>Not Ready &mdash; blocks bots, no structured data, high friction</td><td>${gradeF.length}</td><td>${(gradeF.length / total * 100).toFixed(1)}%</td></tr>
  </tbody>
</table>

<!-- REGIONAL BREAKDOWN -->
<h2>Regional Breakdown</h2>

<div class="kpi-grid" style="grid-template-columns: repeat(${Math.min(regions.length, 5)}, 1fr);">
${regions.slice(0, 5).map(r => `  <div class="kpi" style="border-left: 4px solid ${regionColors[r.name] || '#6B7280'};">
    <div class="value">${r.count}</div><div class="label">${regionLabels[r.name] || r.name}</div>
    <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">Avg: ${r.avg} &middot; Max: ${r.max}</div>
  </div>`).join('\n')}
</div>

<h3>Score Distribution by Region</h3>
<div class="chart-container">
  <div class="bar-chart">
${regions.filter(r => r.count >= 3).map(r => stackedBar(regionLabels[r.name] || r.name, r.merchants, regionColors[r.name] || '#6B7280')).join('\n')}
  </div>
  <div style="display:flex;gap:16px;margin-top:12px;justify-content:center;font-size:12px;">
    <span><span style="display:inline-block;width:12px;height:12px;background:#10B981;border-radius:3px;vertical-align:middle;"></span> A (40+)</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:#3B82F6;border-radius:3px;vertical-align:middle;"></span> B (30&ndash;39)</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:#F59E0B;border-radius:3px;vertical-align:middle;"></span> C (25&ndash;29)</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:#EF4444;border-radius:3px;vertical-align:middle;"></span> D (20&ndash;24)</span>
    <span><span style="display:inline-block;width:12px;height:12px;background:#6B7280;border-radius:3px;vertical-align:middle;"></span> F (&lt;20)</span>
  </div>
</div>

<!-- AVERAGE COMPONENT SCORES -->
<h3>Average Component Scores</h3>
<div class="chart-container">
  <div class="bar-chart">
    <div class="bar-row">
      <div class="bar-label">Accessibility</div>
      <div class="bar-track"><div class="bar-fill" style="width:${avgAccess}%;background:var(--green);">${avgAccess}</div></div>
      <div class="bar-value">/ 100</div>
    </div>
    <div class="bar-row">
      <div class="bar-label">Checkout</div>
      <div class="bar-track"><div class="bar-fill" style="width:${avgCheckout}%;background:var(--orange);">${avgCheckout}</div></div>
      <div class="bar-value">/ 100</div>
    </div>
    <div class="bar-row">
      <div class="bar-label">Data</div>
      <div class="bar-track"><div class="bar-fill" style="width:${avgData}%;background:var(--blue);">${avgData}</div></div>
      <div class="bar-value">/ 100</div>
    </div>
    <div class="bar-row">
      <div class="bar-label">Protocol</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(avgProtocol, 2)}%;background:var(--sly-purple);">${avgProtocol}</div></div>
      <div class="bar-value">/ 100</div>
    </div>
  </div>
</div>

<div class="highlight">
  <strong>Reading the bars:</strong> Accessibility is high (${avgAccess}/100) &mdash; most merchants don&rsquo;t block bots. But protocol support is near-zero (${avgProtocol}/100), meaning the agentic commerce protocol layer simply doesn&rsquo;t exist yet. Data quality (${avgData}) and checkout ease (${avgCheckout}) are moderate. This validates the thesis: the web is accessible to agents, but no one has installed the &ldquo;handshake&rdquo; layer for agents to transact.
</div>

<!-- BUSINESS MODEL MIX -->
<h2>Category Distribution</h2>
<div class="chart-container">
  <div class="bar-chart">
${categories.map(c => {
  const pct = (c.count / total * 100);
  const color = catColors[c.name] || '#6B7280';
  const label = catLabels[c.name] || c.name;
  // If bar is wide enough (>8%), show text inside. Otherwise show outside.
  if (pct >= 8) {
    return `    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color};">${c.count}</div></div>
      <div class="bar-value">avg ${c.avg}</div>
    </div>`;
  } else {
    return `    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 2)}%;background:${color};"></div><span style="margin-left:8px;font-size:12px;font-weight:600;color:var(--gray-700);white-space:nowrap;">${c.count} merchants</span></div>
      <div class="bar-value">avg ${c.avg}</div>
    </div>`;
  }
}).join('\n')}
  </div>
</div>

<!-- TOP PROSPECTS -->
<h2>Top 25 Prospects</h2>
<p style="color:var(--gray-600);margin-bottom:8px;">Click any company to dive into their score breakdown, detected protocols, and a step-by-step checkout testing plan.</p>

<div class="prospect-accordion">
${merchants.slice(0, 25).map((m, i) => prospectAccordion(m, i + 1)).join('\n')}
</div>

<!-- NLWEB MERCHANTS -->
${(() => {
  const nlwebMerchants = merchants.filter(m => m.protocol >= 5 && m.protocol < 10);
  if (nlwebMerchants.length === 0) return '';
  return `<h2>NLWeb Merchants</h2>
<p style="color:var(--gray-600);margin-bottom:8px;">These ${nlwebMerchants.length} merchants have NLWeb signals &mdash; Microsoft's protocol for natural language product discovery. Click to explore and test their endpoints.</p>

<div class="highlight orange">
  <strong>All endpoints returned 404.</strong> We tested all ${nlwebMerchants.length} <code>/.well-known/nlweb</code> endpoints via <code>curl</code> and none responded &mdash; these are false positives from platform heuristics. NLWeb (launched at Microsoft Build 2025) is still pre-adoption: the <a href="https://github.com/microsoft/NLWeb" target="_blank" style="color:#92400E;">GitHub repo</a> has 6.1k stars but only lists proof-of-concept demos. Early testers include Eventbrite, TripAdvisor, O'Reilly Media, and Common Sense Media, but no large-scale merchant rollout has occurred yet. The protocol returns Schema.org JSON via a REST <code>/ask</code> endpoint &mdash; complementary to UCP (NLWeb finds products, UCP buys them) but currently no merchants in our scan have a live endpoint.
</div>

<div class="prospect-accordion">
${nlwebMerchants.sort((a, b) => b.score - a.score).map((m, i) => nlwebAccordion(m, i + 1)).join('\n')}
</div>`;
})()}

<!-- TOP BY REGION -->
<h2>Top Prospects by Region</h2>
${regions.filter(r => r.count >= 3).map(r => regionTop5(r)).join('\n\n')}

<!-- STRATEGY CARDS -->
<h2>Agentic Commerce Enablement: What Sly Offers</h2>
<p style="color:var(--gray-600);margin-bottom:24px;">Sly is an <strong>agentic commerce enablement and success partner</strong> &mdash; helping clients unlock AI-powered commerce through both payments/settlements and internal operations.</p>

<div class="strategy-grid">
  <div class="strategy-card" style="border-top:3px solid #10B981;">
    <h4>Retailers &amp; D2C Brands <span style="font-size:12px;color:var(--gray-500);font-weight:normal;">(${catMap.get('retail')?.length || 0} merchants)</span></h4>
    <p><strong>What Sly provides:</strong> AI shopping agents that buy from their stores. Cross-border stablecoin settlement (Pix, SPEI). Agent-optimized checkout flows and structured data consulting.</p>
  </div>
  <div class="strategy-card" style="border-top:3px solid #3B82F6;">
    <h4>Fintechs &amp; Payments <span style="font-size:12px;color:var(--gray-500);font-weight:normal;">(${catMap.get('fintech')?.length || 0} merchants)</span></h4>
    <p><strong>What Sly provides:</strong> Stablecoin settlement layer. KYA (Know Your Agent) framework. Agent Payment Protocol (AP2) integration for agent-initiated payments.</p>
  </div>
  <div class="strategy-card" style="border-top:3px solid #F59E0B;">
    <h4>Marketplaces <span style="font-size:12px;color:var(--gray-500);font-weight:normal;">(${catMap.get('marketplace')?.length || 0} merchants)</span></h4>
    <p><strong>What Sly provides:</strong> Agent commerce layer across entire merchant networks. Cross-border stablecoin settlement. Agent-powered discovery and purchasing.</p>
  </div>
  <div class="strategy-card" style="border-top:3px solid #06B6D4;">
    <h4>SaaS &amp; B2B <span style="font-size:12px;color:var(--gray-500);font-weight:normal;">(${catMap.get('saas')?.length || 0} merchants)</span></h4>
    <p><strong>What Sly provides:</strong> Internal agent operations. AP2 mandates for automated spending. Agent wallets for treasury management. x402 micropayment integration for API monetization.</p>
  </div>
  <div class="strategy-card" style="border-top:3px solid #EC4899;">
    <h4>Travel &amp; Hospitality <span style="font-size:12px;color:var(--gray-500);font-weight:normal;">(${catMap.get('travel')?.length || 0} merchants)</span></h4>
    <p><strong>What Sly provides:</strong> Agent-powered booking with AP2 spending mandates. Stablecoin settlement for international travel purchases. Agent wallets for corporate travel budgets.</p>
  </div>
  <div class="strategy-card" style="border-top:3px solid #14B8A6;">
    <h4>Healthcare <span style="font-size:12px;color:var(--gray-500);font-weight:normal;">(${catMap.get('healthcare')?.length || 0} merchants)</span></h4>
    <p><strong>What Sly provides:</strong> Agent-managed plan enrollment and appointment booking. Stablecoin billing for cross-border health services. KYA framework for compliance.</p>
  </div>
</div>

<!-- ALL MERCHANTS BY CATEGORY -->
<h2>All Merchants by Category</h2>
<p style="color:var(--gray-600);margin-bottom:24px;">Every scanned merchant organized by category. Use the filter bar above to search, filter by region or score grade.</p>

${categories.map(c => categorySection(c)).join('\n\n')}

<!-- FOOTER -->
<div class="footer">
  <span>Generated by Sly Agentic Commerce Demand Scanner (Epic 56)</span>
  <span>February 19, 2026 &bull; ${total.toLocaleString()} merchants &bull; Scanner v2</span>
</div>

</div><!-- .page -->

<!-- INTERACTIVE FILTER JS -->
<script>
(function() {
  const searchInput = document.getElementById('filter-search');
  const regionSelect = document.getElementById('filter-region');
  const scoreSelect = document.getElementById('filter-score');
  const segmentSelect = document.getElementById('filter-segment');
  const protocolSelect = document.getElementById('filter-protocol');
  const playwrightSelect = document.getElementById('filter-playwright');
  const countEl = document.getElementById('filterCount');

  const allRows = Array.from(document.querySelectorAll('tr[data-company]'));
  const totalCount = allRows.length;

  function scoreGrade(score) {
    if (score >= 40) return 'a';
    if (score >= 30) return 'b';
    if (score >= 25) return 'c';
    if (score >= 20) return 'd';
    return 'f';
  }

  let debounceTimer;

  function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const region = regionSelect.value;
    const scoreFilter = scoreSelect.value;
    const segment = segmentSelect.value;
    const protocol = protocolSelect.value;
    const playwright = playwrightSelect.value;

    let shown = 0;

    allRows.forEach(function(row) {
      const company = (row.getAttribute('data-company') || '').toLowerCase();
      const domain = (row.getAttribute('data-domain') || '').toLowerCase();
      const rowRegion = row.getAttribute('data-region') || '';
      const rowScore = parseInt(row.getAttribute('data-score')) || 0;
      const rowSegment = row.getAttribute('data-segment') || '';
      const rowProtocol = row.getAttribute('data-protocol') || 'none';
      const rowPlaywright = row.getAttribute('data-playwright') || '';

      let visible = true;

      if (search && !company.includes(search) && !domain.includes(search)) {
        visible = false;
      }
      if (region && rowRegion !== region) {
        visible = false;
      }
      if (scoreFilter && scoreGrade(rowScore) !== scoreFilter) {
        visible = false;
      }
      if (segment && rowSegment !== segment) {
        visible = false;
      }
      if (protocol) {
        if (protocol === 'any') {
          if (rowProtocol === 'none') visible = false;
        } else {
          if (rowProtocol !== protocol) visible = false;
        }
      }
      if (playwright) {
        if (playwright === 'automatable') {
          if (rowPlaywright !== 'excellent' && rowPlaywright !== 'good' && rowPlaywright !== 'possible') visible = false;
        } else {
          if (rowPlaywright !== playwright) visible = false;
        }
      }

      if (visible) {
        row.classList.remove('filter-hidden');
        shown++;
      } else {
        row.classList.add('filter-hidden');
      }
    });

    if (shown === totalCount) {
      countEl.innerHTML = 'Showing <strong>all ' + totalCount + '</strong> merchants';
    } else {
      countEl.innerHTML = 'Showing <strong>' + shown + '</strong> of ' + totalCount + ' merchants';
    }

    // Hide empty table sections
    const tables = document.querySelectorAll('table');
    tables.forEach(function(table) {
      const visibleRows = table.querySelectorAll('tbody tr[data-company]:not(.filter-hidden)');
      const totalFilterable = table.querySelectorAll('tbody tr[data-company]');
      if (totalFilterable.length === 0) return;
      const isEmpty = visibleRows.length === 0;
      let el = table;
      const elements = [table];
      let prev = table.previousElementSibling;
      while (prev && prev.tagName !== 'TABLE' && prev.tagName !== 'H2' && prev.tagName !== 'DIV') {
        elements.push(prev);
        prev = prev.previousElementSibling;
      }
      elements.forEach(function(e) {
        if (isEmpty) {
          e.classList.add('section-hidden');
        } else {
          e.classList.remove('section-hidden');
        }
      });
    });
  }

  searchInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 200);
  });

  regionSelect.addEventListener('change', applyFilters);
  scoreSelect.addEventListener('change', applyFilters);
  segmentSelect.addEventListener('change', applyFilters);
  protocolSelect.addEventListener('change', applyFilters);
  playwrightSelect.addEventListener('change', applyFilters);

  window.resetFilters = function() {
    searchInput.value = '';
    regionSelect.value = '';
    scoreSelect.value = '';
    segmentSelect.value = '';
    protocolSelect.value = '';
    playwrightSelect.value = '';
    applyFilters();
  };

  countEl.innerHTML = 'Showing <strong>all ' + totalCount + '</strong> merchants';
})();

// Fetch UCP/ACP endpoint live — tries direct, then CORS proxy fallback
window.fetchEndpoint = async function(btn, domain, protocol) {
  var resultEl = btn.closest('.endpoint-validate').querySelector('.endpoint-result');
  btn.disabled = true;
  btn.querySelector('.validate-icon').textContent = '⏳';
  resultEl.style.display = 'block';

  var url = 'https://' + domain + '/.well-known/' + protocol;
  resultEl.innerHTML = '<div class="ep-header ep-cors">FETCHING...</div><div class="ep-body">Requesting ' + url + ' ...</div>';

  var start = performance.now();

  // Try direct fetch first
  var result = await tryFetch(url, start);

  // If CORS blocked, automatically retry via proxy
  if (result.cors) {
    resultEl.innerHTML = '<div class="ep-header ep-cors">CORS BLOCKED — retrying via proxy...</div><div class="ep-body">Direct fetch blocked. Retrying through corsproxy.io ...</div>';
    start = performance.now();
    var proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
    result = await tryFetch(proxyUrl, start);
    result.proxied = true;
  }

  renderResult(resultEl, result, protocol, domain, url);

  btn.disabled = false;
  btn.querySelector('.validate-icon').textContent = '▶';
};

async function tryFetch(url, start) {
  try {
    var res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' },
      signal: AbortSignal.timeout(12000),
    });
    var elapsed = Math.round(performance.now() - start);
    var contentType = res.headers.get('content-type') || '';
    var bodyText = await res.text();

    var display = bodyText;
    try { display = JSON.stringify(JSON.parse(bodyText), null, 2); } catch(e) {}

    return { ok: res.ok, status: res.status, statusText: res.statusText, contentType: contentType, body: display, elapsed: elapsed, cors: false, timeout: false, error: null, proxied: false };
  } catch(err) {
    var elapsed = Math.round(performance.now() - start);
    var msg = err.message || String(err);
    var isCors = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS') || msg.includes('opaque') || msg.includes('Load failed');
    var isTimeout = msg.includes('timeout') || msg.includes('abort') || msg.includes('Timeout');
    return { ok: false, status: 0, statusText: '', contentType: '', body: '', elapsed: elapsed, cors: isCors, timeout: isTimeout, error: msg, proxied: false };
  }
}

function renderResult(el, r, protocol, domain, origUrl) {
  var via = r.proxied ? ' <span style="font-weight:400;text-transform:none;opacity:0.7;">(via proxy)</span>' : '';

  if (r.ok) {
    el.innerHTML =
      '<div class="ep-header ep-ok">' + protocol.toUpperCase() + ' endpoint responded ✓ — ' + r.status + ' ' + r.statusText + ' (' + r.elapsed + 'ms)' + via +
      '<span style="font-weight:400;text-transform:none;margin-left:auto;">Content-Type: ' + escHtml(r.contentType) + '</span></div>' +
      '<div class="ep-body">' + escHtml(r.body) + '</div>';
  } else if (r.status > 0) {
    el.innerHTML =
      '<div class="ep-header ep-fail">' + protocol.toUpperCase() + ' — HTTP ' + r.status + ' ' + r.statusText + ' (' + r.elapsed + 'ms)' + via + '</div>' +
      '<div class="ep-body">' + escHtml(r.body || '(empty response body)') + '</div>';
  } else if (r.timeout) {
    el.innerHTML =
      '<div class="ep-header ep-fail">TIMEOUT — ' + r.elapsed + 'ms' + via + '</div>' +
      '<div class="ep-body">Request timed out. The endpoint may not exist or the server is slow.\\n\\nTry from terminal:\\n  curl -v ' + origUrl + '</div>';
  } else if (r.cors && !r.proxied) {
    // Both direct and proxy failed
    el.innerHTML =
      '<div class="ep-header ep-cors">CORS BLOCKED' + via + '</div>' +
      '<div class="ep-body">Both direct and proxied requests failed.\\n\\nTry from terminal:\\n  curl -s ' + origUrl + ' | jq .</div>';
  } else {
    el.innerHTML =
      '<div class="ep-header ep-fail">ERROR — ' + r.elapsed + 'ms' + via + '</div>' +
      '<div class="ep-body">' + escHtml(r.error || 'Unknown error') + '</div>';
  }
}

function escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
</script>

</body>
</html>`;

writeFileSync(outputPath, html, 'utf-8');
console.log(`Report written to ${outputPath}`);
console.log(`Total merchants: ${total}`);
console.log(`File size: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
