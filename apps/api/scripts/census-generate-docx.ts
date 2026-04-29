#!/usr/bin/env tsx

/**
 * Census Report DOCX Generator
 *
 * Generates a formal Word document of the "State of Agent Identity" census report.
 * Output: apps/api/scripts/census-report.docx
 *
 * Usage: cd apps/api && npx tsx scripts/census-generate-docx.ts
 */

import 'dotenv/config';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  Footer,
  Header,
  PageNumber,
  NumberFormat,
  PageBreak,
  ShadingType,
} from 'docx';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FONT = 'Calibri';
const FONT_SIZE = 22; // half-points, 22 = 11pt

function text(t: string, opts: { bold?: boolean; italic?: boolean; size?: number; font?: string; color?: string } = {}): TextRun {
  return new TextRun({
    text: t,
    bold: opts.bold,
    italics: opts.italic,
    size: opts.size ?? FONT_SIZE,
    font: opts.font ?? FONT,
    color: opts.color,
  });
}

function para(runs: (TextRun | string)[], opts: { spacing?: { after?: number; before?: number }; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; indent?: { left?: number } } = {}): Paragraph {
  const children = runs.map(r => (typeof r === 'string' ? text(r) : r));
  return new Paragraph({ children, spacing: opts.spacing ?? { after: 120 }, alignment: opts.alignment, indent: opts.indent });
}

function heading(level: (typeof HeadingLevel)[keyof typeof HeadingLevel], t: string): Paragraph {
  return new Paragraph({
    text: t,
    heading: level,
    spacing: { before: 240, after: 120 },
    font: { name: FONT },
  });
}

function bold(t: string): TextRun { return text(t, { bold: true }); }
function italic(t: string): TextRun { return text(t, { italic: true }); }

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Table caption paragraph */
function tableCaption(label: string): Paragraph {
  return para([bold(label)], { spacing: { before: 200, after: 80 } });
}

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: '999999' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function cell(content: string, opts: { bold?: boolean; shading?: string; width?: number } = {}): TableCell {
  return new TableCell({
    children: [para([opts.bold ? bold(content) : content], { spacing: { after: 40 } })],
    borders: BORDERS,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  });
}

function headerRow(cells: string[]): TableRow {
  return new TableRow({
    children: cells.map(c => cell(c, { bold: true, shading: 'D9E2F3' })),
    tableHeader: true,
  });
}

function dataRow(cells: string[]): TableRow {
  return new TableRow({ children: cells.map(c => cell(c)) });
}

function simpleTable(headers: string[], rows: string[][]): Table {
  return new Table({
    rows: [headerRow(headers), ...rows.map(r => dataRow(r))],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function numberedFinding(n: number, t: string): Paragraph {
  return para([bold(`Finding ${n}: `), t], { spacing: { before: 120, after: 120 } });
}

// ---------------------------------------------------------------------------
// Document content
// ---------------------------------------------------------------------------

function buildSections(): Paragraph[] {
  const children: Paragraph[] = [];

  // ── Front Matter ──────────────────────────────────────────────────────
  children.push(
    new Paragraph({ spacing: { after: 600 } }),
    para([text('STATE OF AGENT IDENTITY', { bold: true, size: 48, color: '1F3864' })], { alignment: AlignmentType.CENTER }),
    para([text('A Census of the AI Agent Economy', { italic: true, size: 32, color: '2E75B6' })], { alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    para([bold('Report No: '), 'SLY-LG-2026-001'], { alignment: AlignmentType.CENTER }),
    para([bold('Project: '), 'Looking Glass'], { alignment: AlignmentType.CENTER }),
    para([bold('Date: '), 'April 2026'], { alignment: AlignmentType.CENTER }),
    para([bold('Author: '), 'Sly Research (getsly.ai)'], { alignment: AlignmentType.CENTER }),
    para([bold('Classification: '), 'Public'], { alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
  );

  // ── Abstract ──────────────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, 'Abstract'),
    para([
      'This report presents findings from the first comprehensive census of AI agent identity, trust, and compliance across the open agent economy. ',
      'We surveyed 12,075 entities across 8 platforms including agent marketplaces, MCP server registries, and known web agent directories. ',
      'Key findings: (1) 92.8% of marketplace agents have no verifiable identity beyond a username; ',
      '(2) zero completed agent-to-agent escrow transactions exist; ',
      '(3) only 5 agents (0.7%) meet minimum compliance readiness; ',
      '(4) identity systems are entirely siloed with only 1 cross-platform agent detected.',
    ]),
  );

  // ── Table of Contents ─────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, 'Table of Contents'),
  );
  const tocEntries = [
    ['Abstract', '2'],
    ['1. Introduction', '4'],
    ['   1.1 Purpose and Scope', '4'],
    ['   1.2 Research Questions', '4'],
    ['2. Methodology', '5'],
    ['   2.1 Data Collection', '5'],
    ['   2.2 Platforms Surveyed', '5'],
    ['   2.3 Limitations', '6'],
    ['3. Agent Landscape', '7'],
    ['   3.1 Population', '7'],
    ['   3.2 Enterprise Directories', '7'],
    ['4. Identity Analysis', '9'],
    ['   4.1 KYA Tiers', '9'],
    ['   4.2 Identity Sources', '9'],
    ['   4.3 Identity Layers', '10'],
    ['   4.4 Human Traceability', '10'],
    ['5. Trust & Reputation', '11'],
    ['6. Transaction Infrastructure', '13'],
    ['7. Proof of Work', '15'],
    ['8. Compliance Readiness', '17'],
    ['9. MCP Ecosystem', '19'],
    ['10. Skill Economy', '20'],
    ['11. Cross-Platform Identity', '21'],
    ['12. Enterprise vs Open', '22'],
    ['13. Conclusions', '23'],
    ['References', '25'],
    ['Citation', '26'],
  ];
  for (const [entry, page] of tocEntries) {
    children.push(para([entry + '  ...........  ' + page], { spacing: { after: 40 } }));
  }

  // ── 1. Introduction ───────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '1. Introduction'),
    heading(HeadingLevel.HEADING_2, '1.1 Purpose and Scope'),
    para([
      'This report constitutes the first comprehensive census of AI agent identity across the open agent economy. ',
      'As AI agents increasingly participate in economic activity\u2014from marketplace transactions to autonomous service delivery\u2014the question of how agents are identified, trusted, and held accountable becomes critical. ',
      'The census aims to establish a baseline measurement of the current state of agent identity infrastructure, trust mechanisms, and compliance readiness.',
    ]),
    heading(HeadingLevel.HEADING_2, '1.2 Research Questions'),
    para([bold('RQ1: '), 'How many AI agents exist across publicly accessible platforms?']),
    para([bold('RQ2: '), 'What forms of identity do these agents possess?']),
    para([bold('RQ3: '), 'Can agents transact with each other or with humans?']),
    para([bold('RQ4: '), 'Are agents compliant with emerging regulatory frameworks?']),
  );

  // ── 2. Methodology ────────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '2. Methodology'),
    heading(HeadingLevel.HEADING_2, '2.1 Data Collection'),
    para([
      'Data was collected through four complementary methods: (1) REST API scanning of agent marketplace endpoints, ',
      '(2) HTML scraping of agent directory pages, (3) on-chain enrichment via Base/Ethereum RPC calls to resolve wallet balances and transaction histories, ',
      'and (4) GitHub enrichment to measure open-source reputation of MCP servers.',
    ]),
    heading(HeadingLevel.HEADING_2, '2.2 Platforms Surveyed'),
    tableCaption('Table 1: Platforms Surveyed'),
    simpleTable(
      ['Platform', 'Domain', 'Method', 'Agents'],
      [
        ['MoltRoad', 'moltroad.com', 'REST API', '439'],
        ['ClawMarket', 'claw-market.xyz', 'REST API', '26'],
        ['Moltbook', 'moltbook.com', 'REST API', '255'],
        ['Virtuals Protocol', 'api.virtuals.io', 'REST API', '10 of 38,801'],
        ['MCP Registry', 'registry.modelcontextprotocol.io', 'REST API', '4,971'],
        ['Glama Registry', 'glama.ai', 'Sitemap', '4,742 (new)'],
        ['Known Agents', 'knownagents.com', 'HTML Scrape', '1,632'],
        ['Base Chain', 'basescan.org', 'RPC', '122 wallets'],
      ],
    ),
    heading(HeadingLevel.HEADING_2, '2.3 Limitations'),
    para(['Several limitations constrain the scope of this census:']),
    para(['\u2022 The Virtuals Protocol API limited responses to 10 agents out of 38,801 total.'], { indent: { left: 360 } }),
    para(['\u2022 Enterprise agent directories (Oracle, IBM, SAP, etc.) are private and could not be accessed.'], { indent: { left: 360 } }),
    para(['\u2022 Moltbook follower counts were unavailable via public API.'], { indent: { left: 360 } }),
  );

  // ── 3. Agent Landscape ────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '3. Agent Landscape'),
    heading(HeadingLevel.HEADING_2, '3.1 Population'),
    tableCaption('Table 2: Agent Population by Platform'),
    simpleTable(
      ['Platform', 'Count'],
      [
        ['MoltRoad', '439'],
        ['Moltbook', '255'],
        ['ClawMarket', '26'],
        ['Virtuals Protocol', '10'],
        ['MCP Registry', '4,971'],
        ['Glama Registry', '4,742 (258 overlap)'],
        ['MCP Combined', '9,713'],
        ['Known Agents', '1,632'],
        ['Total', '12,075'],
      ],
    ),
    heading(HeadingLevel.HEADING_2, '3.2 Enterprise Directories'),
    para([
      'Beyond the open platforms surveyed, significant agent populations exist behind enterprise walls. ',
      'These directories were identified but could not be enumerated:',
    ]),
    tableCaption('Table 3: Enterprise Agent Directories'),
    simpleTable(
      ['Platform', 'Est. Agents', 'Access'],
      [
        ['ServiceNow', '13', 'Public'],
        ['Oracle', '400+', 'Private'],
        ['AWS AgentCore', 'Preview', 'Preview'],
        ['IBM watsonx', 'Unknown', 'Private'],
        ['Workday', 'Coming Soon', 'Coming Soon'],
        ['HubSpot', 'Unknown', 'Tier-locked'],
        ['SAP', 'Unknown', 'Private'],
        ['Zendesk', 'No marketplace', 'N/A'],
      ],
    ),
    para([
      bold('Note: '),
      'Additional large-scale directories exist outside the enterprise category: skills.sh (91K+ entries) and HuggingFace (500K+ models/spaces). ',
      'These were not included in the census count as they represent tools/models rather than autonomous agents, but they signal the scale of the broader ecosystem.',
    ]),
  );

  // ── 4. Identity Analysis ──────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '4. Identity Analysis'),
    heading(HeadingLevel.HEADING_2, '4.1 KYA Tiers'),
    para([
      'Using Sly\'s Know Your Agent (KYA) framework, we classified all 730 marketplace agents (MoltRoad, Moltbook, ClawMarket, Virtuals) into identity tiers:',
    ]),
    tableCaption('Table 4: KYA Tier Distribution'),
    simpleTable(
      ['Tier', 'Description', 'Count', '%'],
      [
        ['T0', 'No verifiable identity', '678', '92.8%'],
        ['T1', 'Basic identity (social link or wallet)', '52', '7.1%'],
        ['T2', 'Verified identity', '0', '0%'],
        ['T3', 'Enterprise-grade identity', '0', '0%'],
      ],
    ),
    heading(HeadingLevel.HEADING_2, '4.2 Identity Sources'),
    tableCaption('Table 5: Identity Source Distribution'),
    simpleTable(
      ['Source', 'Count', '%'],
      [
        ['Twitter/X', '37', '5.1%'],
        ['Wallet', '142', '19.5%'],
        ['Bio', '441', '60.4%'],
        ['Avatar', '50', '6.8%'],
        ['Verified', '37', '5.1%'],
      ],
    ),
    heading(HeadingLevel.HEADING_2, '4.3 Identity Layers'),
    para(['We measured the number of distinct identity layers each agent possesses (out of 5: bio, avatar, wallet, social link, verification):']),
    tableCaption('Table 6: Identity Layer Distribution'),
    simpleTable(
      ['Layers', 'Count', '%'],
      [
        ['0', '277', '38.5%'],
        ['1', '296', '41.1%'],
        ['2', '110', '15.3%'],
        ['3', '3', '0.4%'],
        ['4', '18', '2.5%'],
        ['5', '16', '2.2%'],
      ],
    ),
    heading(HeadingLevel.HEADING_2, '4.4 Human Traceability'),
    para([
      'Only 37 agents (5.1%) are traceable to a human identity via X/Twitter OAuth verification. ',
      'No other platform provides a comparable traceability mechanism. ',
      'The remaining 94.9% of agents have no verifiable link to a human operator.',
    ]),
  );

  // ── 5. Trust & Reputation ─────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '5. Trust & Reputation'),
    heading(HeadingLevel.HEADING_2, '5.1 MoltRoad'),
    para([
      'MoltRoad implements a trust-level system for agents. However, all 439 agents remain at trust level 0. ',
      'Only 1 peer rating has been recorded across the entire platform.',
    ]),
    heading(HeadingLevel.HEADING_2, '5.2 Moltbook'),
    para([
      'Moltbook uses a karma-based social reputation system. Karma scores range from 1,000 to 500,000. ',
      '99 agents have karma scores of 1,000 or above. Karma is earned through social engagement rather than economic activity.',
    ]),
    heading(HeadingLevel.HEADING_2, '5.3 ClawMarket'),
    para([
      'ClawMarket includes a reputation field in its agent schema, but all agents show a reputation score of zero. ',
      'No reviews or ratings have been submitted.',
    ]),
    heading(HeadingLevel.HEADING_2, '5.4 Virtuals Protocol'),
    para([
      'Virtuals Protocol uses market capitalization as a proxy for reputation. Agents are primarily entertainment personas ',
      'with token-based valuations rather than service-based trust metrics.',
    ]),
    heading(HeadingLevel.HEADING_2, '5.5 The Paradox'),
    para([bold('Key Finding: '), 'A striking inverse relationship exists between identity verification and economic activity.']),
    para([
      'X-verified agents (those with social identity links) average only 1 on-chain transaction each. ',
      'In contrast, wallet-only agents (those with no social identity, only a blockchain address) average 18.8 transactions ',
      'and hold an average of $214 USDC. Identity-rich agents are economically inactive; economically active agents are identity-poor.',
    ]),
  );

  // ── 6. Transaction Infrastructure ─────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '6. Transaction Infrastructure'),
    heading(HeadingLevel.HEADING_2, '6.1 MoltRoad'),
    para([
      'MoltRoad implements a $MOLTROAD token-based escrow system with a defined commerce flow: ',
      'Deposit \u2192 List \u2192 Order \u2192 Deliver \u2192 Confirm \u2192 Rate. ',
      'Steps 1\u20132 (Deposit and List) are active: 2.03M tokens have been deposited and agents have listed services. ',
      'Steps 3\u20136 (Order through Rate) have never been triggered. Zero orders have been placed.',
    ]),
    heading(HeadingLevel.HEADING_2, '6.2 ClawMarket'),
    para([
      'ClawMarket uses x402/USDC on-chain escrow for paid skills. Of 161 total skills, 82 are paid (ranging from $0.001 to $100). ',
      '158,000 free skill installs have been recorded. Zero paid purchases have been completed.',
    ]),
    heading(HeadingLevel.HEADING_2, '6.3 Platform Comparison'),
    tableCaption('Table 7: Transaction Infrastructure Comparison'),
    simpleTable(
      ['Dimension', 'MoltRoad', 'ClawMarket'],
      [
        ['Commerce Model', '$MOLTROAD token escrow', 'x402/USDC on-chain escrow'],
        ['Currency', '$MOLTROAD', 'USDC'],
        ['Escrow', 'Smart contract', 'On-chain'],
        ['Settlement', 'Token transfer', 'USDC transfer'],
        ['Auth', 'Wallet signature', 'Wallet signature'],
        ['Orders Completed', '0', '0'],
      ],
    ),
  );

  // ── 7. Proof of Work ──────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '7. Proof of Work'),
    heading(HeadingLevel.HEADING_2, '7.1 Critical Finding'),
    numberedFinding(1, 'Zero escrow completions across all platforms.'),
    numberedFinding(2, 'Zero bounties fulfilled.'),
    numberedFinding(3, 'Zero skill sales (paid).'),
    numberedFinding(4, 'One (1) peer rating recorded (entire ecosystem).'),
    numberedFinding(5, 'Zero disputes filed.'),
    heading(HeadingLevel.HEADING_2, '7.2 Activity Distribution'),
    tableCaption('Table 8: Agent Activity Distribution'),
    simpleTable(
      ['Category', 'Count', '%'],
      [
        ['Ghost (no activity)', '312', '42.7%'],
        ['Registered Only', '336', '46.0%'],
        ['Some Activity', '58', '7.9%'],
        ['Active Builder', '24', '3.3%'],
      ],
    ),
    heading(HeadingLevel.HEADING_2, '7.3 Economy Funnel'),
    para([
      'The agent economy exhibits a severe attrition funnel: ',
      '730 registered \u2192 441 with bio \u2192 142 with wallet \u2192 37 with social link \u2192 38 with on-chain activity \u2192 ',
      '29 with meaningful balance \u2192 1 with peer rating \u2192 0 with completed transaction.',
    ]),
    heading(HeadingLevel.HEADING_2, '7.4 Proof-of-Work Types'),
    tableCaption('Table 9: Proof-of-Work Types'),
    simpleTable(
      ['PoW Type', 'Platform', 'Signal', 'Trust Value', 'Agent Count'],
      [
        ['Token Deposit', 'MoltRoad', 'Financial stake', 'Medium', '~50'],
        ['Karma Score', 'Moltbook', 'Social engagement', 'Low', '99'],
        ['X Verification', 'MoltRoad', 'Human traceability', 'Medium', '37'],
        ['Wallet Activity', 'Base Chain', 'On-chain history', 'Medium-High', '38'],
        ['USDC Balance', 'Base Chain', 'Financial capacity', 'Medium', '29'],
        ['GitHub Stars', 'MCP Registry', 'Open-source reputation', 'Medium', '75 (1K+)'],
        ['Peer Rating', 'MoltRoad', 'Social proof', 'High', '1'],
        ['Completed Order', 'Any', 'Economic proof', 'Highest', '0'],
      ],
    ),
  );

  // ── 8. Compliance Readiness ───────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '8. Compliance Readiness'),
    heading(HeadingLevel.HEADING_2, '8.1 Scoring Methodology'),
    para([
      'Each agent was scored across 10 compliance dimensions (1 point each): ',
      'social link, external verification, valid wallet, on-chain history, meaningful bio, ',
      'declared capabilities, service tags, peer review, financial stake, and bond collateral.',
    ]),
    heading(HeadingLevel.HEADING_2, '8.2 Results'),
    tableCaption('Table 10: Compliance Readiness Distribution'),
    simpleTable(
      ['Category', 'Score Range', 'Count', '%'],
      [
        ['Compliant-Ready', '7\u201310', '5', '0.7%'],
        ['Partial', '4\u20136', '52', '7.1%'],
        ['Minimal', '1\u20133', '367', '50.3%'],
        ['None', '0', '306', '41.9%'],
      ],
    ),
    para([bold('Maximum observed score: '), '8 out of 10.']),
    heading(HeadingLevel.HEADING_2, '8.3 Top Agents'),
    tableCaption('Table 11: Highest-Scoring Agents'),
    simpleTable(
      ['Agent', 'Score', 'Platform'],
      [
        ['RoyalKobold', '8/10', 'MoltRoad'],
        ['Zeta_v1', '8/10', 'MoltRoad'],
        ['LarryLemonade', '8/10', 'MoltRoad'],
        ['clawd-0x', '8/10', 'MoltRoad'],
      ],
    ),
  );

  // ── 9. MCP Ecosystem ──────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '9. MCP Ecosystem'),
    heading(HeadingLevel.HEADING_2, '9.1 Registry Fragmentation'),
    para([
      'Two major MCP server registries exist: the official Model Context Protocol registry (4,971 servers) and Glama (4,742 servers). ',
      'Only 258 servers appear in both registries, representing a 2.7% overlap. Combined, 9,713 unique MCP servers were identified.',
    ]),
    heading(HeadingLevel.HEADING_2, '9.2 GitHub as Reputation'),
    para([
      'Of the 9,713 MCP servers, 3,643 were successfully enriched with GitHub metadata. ',
      'These servers have accumulated 815,309 total GitHub stars. 75 servers have 1,000 or more stars. ',
      'The average star count is 224.',
    ]),
    heading(HeadingLevel.HEADING_2, '9.3 Top MCP Servers by GitHub Stars'),
    tableCaption('Table 12: Top MCP Servers'),
    simpleTable(
      ['Server', 'GitHub Stars'],
      [
        ['netdata', '78,000'],
        ['context7', '51,000'],
        ['tldraw', '46,000'],
        ['ChromeDevTools', '33,000'],
        ['PostHog', '32,000'],
      ],
    ),
  );

  // ── 10. Skill Economy ─────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '10. Skill Economy'),
    heading(HeadingLevel.HEADING_2, '10.1 Catalog'),
    para([
      'ClawMarket hosts 161 skills: 79 free and 82 paid. Paid skill prices range from $0.001 to $100, ',
      'with an average price of $2.75.',
    ]),
    heading(HeadingLevel.HEADING_2, '10.2 Demand'),
    para([
      'The top 14 skills account for 99.6% of all 158,000 installs. All top skills are free. ',
      'Paid skills have approximately zero purchases.',
    ]),
    heading(HeadingLevel.HEADING_2, '10.3 Concentration'),
    para([
      'The skill economy is highly concentrated: the creator "somenoise" publishes 43 skills (27% of all skills), ',
      'while "steipete" publishes 9 core infrastructure skills.',
    ]),
  );

  // ── 11. Cross-Platform Identity ────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '11. Cross-Platform Identity'),
    heading(HeadingLevel.HEADING_2, '11.1 The embr Case'),
    para([
      'Only 1 agent was detected operating across multiple platforms: "embr." This agent operates with 2 wallets ',
      '(0x21C4... and 0x483A...) across 2 platforms, with 430 combined on-chain transactions. ',
      'Despite this significant activity, embr has zero portable reputation\u2014its identity and transaction history ',
      'on one platform are invisible to the other.',
    ]),
    para([bold('Implication: '), 'Even the most active cross-platform agent in the ecosystem cannot carry trust from one context to another.']),
  );

  // ── 12. Enterprise vs Open ─────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '12. Enterprise vs Open'),
    heading(HeadingLevel.HEADING_2, '12.1 Comparison'),
    tableCaption('Table 13: Enterprise vs Open Agent Ecosystems'),
    simpleTable(
      ['Dimension', 'Enterprise', 'Open'],
      [
        ['Access', 'Gated / Private', 'Public'],
        ['Identity', 'Corporate SSO', 'Username / Wallet'],
        ['Verification', 'Org-managed', 'None or social'],
        ['Reputation', 'Internal metrics', 'Karma / Stars'],
        ['Financial', 'Corporate billing', 'Token / USDC'],
        ['Portability', 'None (locked)', 'None (siloed)'],
        ['Agent Count', '400+ (est.)', '12,075 surveyed'],
        ['Skill Marketplace', 'Curated', 'Open listing'],
        ['Governance', 'Corporate policy', 'None'],
      ],
    ),
    heading(HeadingLevel.HEADING_2, '12.2 Bridge Opportunity'),
    para([
      'Enterprise ecosystems have governance and verification but no portability. ',
      'Open ecosystems have the potential for portability but lack governance and verification. ',
      'A bridge protocol that enables verified identity to travel across both domains represents a significant opportunity.',
    ]),
  );

  // ── 13. Conclusions ────────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, '13. Conclusions'),
    heading(HeadingLevel.HEADING_2, '13.1 Key Findings'),
    numberedFinding(1, '92.8% of marketplace agents have no verifiable identity beyond a username (KYA Tier 0).'),
    numberedFinding(2, 'Zero completed agent-to-agent escrow transactions exist across all surveyed platforms.'),
    numberedFinding(3, 'Only 5 agents (0.7%) meet minimum compliance readiness (score 7+/10).'),
    numberedFinding(4, 'Identity systems are entirely siloed\u2014only 1 cross-platform agent was detected.'),
    numberedFinding(5, 'An inverse relationship exists between identity verification and economic activity: wallet-only agents transact 18.8x more than identity-verified agents.'),
    numberedFinding(6, 'The MCP ecosystem is fragmented across registries with only 2.7% overlap, yet represents the largest concentration of agent-like entities (9,713 servers).'),

    heading(HeadingLevel.HEADING_2, '13.2 Implications for KYA'),
    para([
      'The census demonstrates an urgent need for a standardized Know Your Agent framework. ',
      'Current identity systems are platform-specific, non-portable, and fail to establish trust. ',
      'A KYA standard must address: (1) cross-platform identity portability, (2) proof-of-work as a trust signal, ',
      '(3) compliance scoring that scales from open agents to enterprise deployments, and (4) progressive verification ',
      'that does not create barriers to entry.',
    ]),

    heading(HeadingLevel.HEADING_2, '13.3 Future Research'),
    para([
      'Several avenues for future research remain: (1) Comprehensive survey of skills.sh (91K+ entries) and Agent Arena, ',
      '(2) Negotiated access to enterprise agent directories (Oracle, IBM, SAP), ',
      '(3) Longitudinal tracking of agent identity and economic activity over time, ',
      '(4) Cross-chain analysis beyond Base to Ethereum mainnet, Solana, and other L2s.',
    ]),
  );

  // ── References ─────────────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, 'References'),
  );
  const refs: string[] = [
    '[1] MoltRoad Agent Marketplace. https://moltroad.com. Accessed March 2026.',
    '[2] ClawMarket Agent Marketplace. https://claw-market.xyz. Accessed March 2026.',
    '[3] Moltbook Agent Directory. https://moltbook.com. Accessed March 2026.',
    '[4] Virtuals Protocol. https://api.virtuals.io. Accessed March 2026.',
    '[5] Model Context Protocol Registry. https://registry.modelcontextprotocol.io. Accessed March 2026.',
    '[6] Glama MCP Registry. https://glama.ai. Accessed March 2026.',
    '[7] Known Agents Directory. https://knownagents.com. Accessed March 2026.',
    '[8] BaseScan Block Explorer. https://basescan.org. Accessed March 2026.',
    '[9] ServiceNow AI Agents. https://www.servicenow.com/products/ai-agents.html. Accessed March 2026.',
    '[10] Oracle AI Agent Studio. https://www.oracle.com/artificial-intelligence/ai-agent-studio/. Accessed March 2026.',
    '[11] AWS Bedrock AgentCore. https://aws.amazon.com/bedrock/agentcore/. Accessed March 2026.',
    '[12] IBM watsonx Orchestrate. https://www.ibm.com/products/watsonx-orchestrate. Accessed March 2026.',
    '[13] HubSpot Agent.AI. https://www.agent.ai. Accessed March 2026.',
    '[14] SAP Joule AI Agents. https://www.sap.com/products/artificial-intelligence.html. Accessed March 2026.',
    '[15] Zendesk AI Agents. https://www.zendesk.com/platform/ai/. Accessed March 2026.',
    '[16] skills.sh MCP Directory. https://skills.sh. Accessed March 2026.',
    '[17] HuggingFace Model Hub. https://huggingface.co. Accessed March 2026.',
    '[18] Sly KYA Framework. https://getsly.ai. Accessed March 2026.',
  ];
  for (const ref of refs) {
    children.push(para([ref], { spacing: { after: 60 } }));
  }

  // ── Citation ───────────────────────────────────────────────────────────
  children.push(
    pageBreak(),
    heading(HeadingLevel.HEADING_1, 'Citation'),
    para([italic(
      'Sly Research. (2026). State of Agent Identity: A Census of the AI Agent Economy. Report No. SLY-LG-2026-001. Project Looking Glass.',
    )]),
  );

  return children;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const children = buildSections();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch = 1440 twips
            size: { width: 12240, height: 15840 }, // Letter
          },
        },
        headers: {
          default: new Header({
            children: [
              para(
                [text('SLY-LG-2026-001 | State of Agent Identity', { size: 18, color: '888888' })],
                { alignment: AlignmentType.RIGHT, spacing: { after: 0 } },
              ),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  text('Page ', { size: 18, color: '888888' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '888888',
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const outPath = resolve(__dirname, 'census-report.docx');
  writeFileSync(outPath, buffer);
  console.log(`Census report written to: ${outPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('Failed to generate census report:', err);
  process.exit(1);
});
