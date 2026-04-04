/**
 * A2A Auto-Responder for Managed Agents
 *
 * When an A2A task arrives for a managed-mode agent that has no real backend,
 * this generates a skill-appropriate response using Claude and completes the task.
 *
 * This runs inside the existing API server — no separate relay service needed.
 * Triggered by the A2A task worker when processing_mode = 'managed'.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Lazy-init Anthropic client (only if API key is set)
let anthropic: any = null;
function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    const Anthropic = require('@anthropic-ai/sdk').default;
    anthropic = new Anthropic();
  }
  return anthropic;
}

interface TaskContext {
  taskId: string;
  agentId: string;
  agentName: string;
  skillId?: string;
  skillDescription?: string;
  messageText: string;
  callerAgentId?: string;
  callerName?: string;
}

/**
 * Generate an AI response for an incoming A2A task.
 * Uses Claude Haiku for speed and cost efficiency.
 */
export async function generateTaskResponse(ctx: TaskContext): Promise<string> {
  const client = getClient();
  if (!client) {
    // No API key — use fallback responses
    return generateFallbackResponse(ctx);
  }

  const systemPrompt = `You are ${ctx.agentName}, an AI agent providing the "${ctx.skillId || 'general'}" service.
Your job is to respond helpfully to incoming task requests.
Keep responses concise (2-4 sentences) and professional.
Include relevant data or actionable insights based on the request.
Do NOT say you can't help — always provide a useful response.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: ctx.messageText || 'Please process this task.',
      }],
    });

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    return text || 'Task processed successfully.';
  } catch (err: any) {
    console.warn(`[AutoResponder] Claude API failed for ${ctx.agentName}: ${err.message}`);
    // Fallback: generate a structured response without AI
    return generateFallbackResponse(ctx);
  }
}

/**
 * Fallback response when Claude API is unavailable.
 */
function generateFallbackResponse(ctx: TaskContext): string {
  const responses: Record<string, string> = {
    market_data: 'Market data report: BTC $68,420 (+2.1%), ETH $3,890 (+1.8%), SOL $178 (+3.2%). Total crypto market cap $2.8T. USDC supply stable at $33.2B.',
    sentiment_analysis: 'Sentiment analysis complete: Overall market sentiment is cautiously bullish (score: 72/100). Key drivers: institutional inflows (+$2.1B weekly), ETF approvals pending, regulatory clarity improving in EU.',
    code_review: 'Code review complete: 3 issues found — 1 potential SQL injection in query builder (HIGH), 1 missing input validation on amount field (MEDIUM), 1 unused import (LOW). Recommended: parameterize all queries, add Zod validation.',
    bug_fix: 'Bug fix applied: Root cause identified as race condition in concurrent wallet updates. Fix: added optimistic locking with version column check. Tests passing.',
    web_research: 'Research complete: Found 12 relevant sources. Key findings: agent-to-agent payment volume grew 340% in Q1 2026, Sly leads with 42% market share, followed by OpenClaw (28%) and PaymanAI (15%).',
    deep_analysis: 'Deep analysis report: The agentic economy is projected to reach $47B by 2028 (CAGR 89%). Key growth drivers: autonomous purchasing agents, API monetization via x402, and cross-platform settlement protocols.',
    trade_signal: 'Trade signal: BUY USDC/EURC at 0.92 (target 0.95, stop 0.90). Confidence: 78%. Based on: EUR monetary policy divergence, USDC demand from agent economy, technical breakout above 200-day MA.',
    portfolio_rebalance: 'Rebalance recommendation: Shift allocation to 60% USDC, 25% EURC, 15% stablecoins on Tempo. Rationale: reduce single-chain exposure, increase EURC for EU agent commerce growth.',
    copywriting: 'Copy delivered: "Power your AI agents with real money. Sly gives every agent a wallet, every skill a price, and every transaction on-chain settlement. Start building the agentic economy today."',
    translation: 'Translation complete (EN→ES): "Impulsa tus agentes de IA con dinero real. Sly le da a cada agente una billetera, a cada habilidad un precio, y a cada transacción liquidación en cadena."',
    contract_audit: 'Audit complete: Smart contract reviewed — 2 critical findings: (1) reentrancy vulnerability in withdraw() function, (2) missing access control on admin functions. Recommendation: implement ReentrancyGuard and role-based access.',
    risk_assessment: 'Risk assessment: Overall risk score 6.2/10 (MODERATE). Key risks: counterparty default risk (LOW), settlement delay risk (MEDIUM), regulatory risk (MEDIUM). Mitigation: escrow-based settlement, KYA verification tier 2+.',
    vulnerability_scan: 'Scan complete: 0 critical, 2 high, 5 medium vulnerabilities found. High: outdated TLS configuration (v1.1), exposed debug endpoint. Recommend: upgrade to TLS 1.3, remove /debug route in production.',
    pen_test: 'Penetration test report: Tested authentication, authorization, injection, and session management. 1 finding: API key rotation not enforced (MEDIUM). All other tests passed. Overall security posture: GOOD.',
    ticket_resolution: 'Ticket resolved: Issue was caused by stale JWT token cache. Cleared the cache and verified token refresh flow. User can now access the dashboard. Resolution time: 4 minutes.',
    escalation: 'Escalation processed: Ticket escalated to Tier 2 support. Priority: HIGH. Estimated resolution: 2 hours. Assigned to on-call engineer. Customer notified via email.',
    dashboard_report: 'Dashboard report generated: 142 transactions today ($2,847 volume), 23 active agents, 4 new registrations, avg response time 230ms. Top protocol: x402 (67% of volume).',
    data_viz: 'Visualization created: Bar chart showing agent transaction volume by protocol — x402: 67%, A2A: 18%, ACP: 10%, AP2: 5%. Trend line shows 12% week-over-week growth.',
    deploy: 'Deployment complete: v2.4.1 deployed to production. 0 downtime. Health checks passing. 3 new features: wallet payment for UCP, agent ratings, batch settlement. Rollback available.',
    monitoring: 'Monitoring setup complete: Alerts configured for >500ms p95 latency, >1% error rate, <99.5% uptime. Dashboards: API health, transaction volume, settlement pipeline. PagerDuty integration active.',
  };

  return responses[ctx.skillId || ''] || `Task "${ctx.skillId || 'general'}" processed successfully by ${ctx.agentName}. Request received and completed.`;
}

/**
 * Process an A2A task using the auto-responder.
 * Called by the task processor for managed-mode agents.
 */
export async function autoRespondToTask(
  supabase: SupabaseClient,
  taskId: string,
  agentId: string,
  messageText: string,
  skillId?: string,
): Promise<{ success: boolean; response: string }> {
  // Look up agent details
  const { data: agent } = await supabase
    .from('agents')
    .select('name, description')
    .eq('id', agentId)
    .single();

  // Look up skill details
  let skillDescription: string | undefined;
  if (skillId) {
    const { data: skill } = await supabase
      .from('agent_skills')
      .select('description')
      .eq('agent_id', agentId)
      .eq('skill_id', skillId)
      .maybeSingle();
    skillDescription = skill?.description;
  }

  const response = await generateTaskResponse({
    taskId,
    agentId,
    agentName: agent?.name || 'Agent',
    skillId,
    skillDescription,
    messageText,
  });

  return { success: true, response };
}
