'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Terminal,
  Network,
  Code,
  Globe,
  FileCode,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { CodeBlock } from '../shared/code-block';
import { GlowButton } from '../shared/glow-button';
import { Celebration } from '../shared/celebration';

interface IntegrationStepProps {
  apiKeys: { test: { key: string; prefix: string }; live: { key: string; prefix: string } } | null;
  accountId: string | null;
  onComplete: () => void;
}

type IntegrationMethod = 'mcp' | 'a2a' | 'sdk' | 'api' | 'skills';

interface MethodDef {
  id: IntegrationMethod;
  icon: typeof Terminal;
  label: string;
  desc: string;
  accent: string;
  logos: string[];
}

const methods: MethodDef[] = [
  {
    id: 'mcp',
    icon: Terminal,
    label: 'MCP Server',
    desc: 'Connect Claude, ChatGPT, or Gemini',
    accent: 'purple',
    logos: ['Claude', 'ChatGPT', 'Gemini'],
  },
  {
    id: 'a2a',
    icon: Network,
    label: 'A2A Protocol',
    desc: 'Agent-to-agent communication',
    accent: 'indigo',
    logos: ['Any Agent'],
  },
  {
    id: 'sdk',
    icon: Code,
    label: 'SDK',
    desc: 'Build agents programmatically',
    accent: 'blue',
    logos: ['Node.js', 'TypeScript'],
  },
  {
    id: 'api',
    icon: Globe,
    label: 'REST API',
    desc: 'Direct HTTP from any language',
    accent: 'emerald',
    logos: ['Python', 'Go', 'Any'],
  },
  {
    id: 'skills',
    icon: FileCode,
    label: 'Skills.md',
    desc: 'Discoverable agent card',
    accent: 'amber',
    logos: ['Claude', 'ChatGPT', 'Gemini'],
  },
];

const accentColors: Record<string, { icon: string; bg: string; border: string }> = {
  purple: { icon: 'text-purple-400', bg: 'bg-purple-500/15', border: 'group-hover:border-purple-500/30' },
  indigo: { icon: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'group-hover:border-indigo-500/30' },
  blue: { icon: 'text-blue-400', bg: 'bg-blue-500/15', border: 'group-hover:border-blue-500/30' },
  emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'group-hover:border-emerald-500/30' },
  amber: { icon: 'text-amber-400', bg: 'bg-amber-500/15', border: 'group-hover:border-amber-500/30' },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

function getCodeContent(
  method: IntegrationMethod,
  apiKey: string,
  accountId: string,
  subMethod?: string,
): { code: string; language: string } {
  switch (method) {
    case 'mcp':
      if (subMethod === 'chatgpt') {
        return {
          language: 'json',
          code: `// In ChatGPT → Create a GPT → Actions → Import URL:
// https://api.getsly.ai/v1/openapi.json

// Or add this action schema:
{
  "openapi": "3.0.0",
  "info": { "title": "Sly", "version": "1.0" },
  "servers": [{ "url": "https://api.getsly.ai" }],
  "paths": {
    "/v1/accounts": {
      "get": {
        "summary": "List accounts",
        "operationId": "listAccounts"
      }
    }
  }
}

// Authentication: API Key → Bearer ${apiKey}`,
        };
      }
      if (subMethod === 'gemini') {
        return {
          language: 'json',
          code: `// Gemini supports MCP — add to your config:
{
  "mcpServers": {
    "sly": {
      "command": "npx",
      "args": ["@sly/mcp-server"],
      "env": {
        "SLY_API_KEY": "${apiKey}"
      }
    }
  }
}

// Or use the REST API directly with Gemini function calling`,
        };
      }
      // Default: Claude
      return {
        language: 'json',
        code: `{
  "mcpServers": {
    "sly": {
      "command": "npx",
      "args": ["@sly/mcp-server"],
      "env": {
        "SLY_API_KEY": "${apiKey}"
      }
    }
  }
}`,
      };
    case 'a2a':
      return {
        language: 'bash',
        code: `# Register agent with skills for a rich agent card
curl -X POST https://api.getsly.ai/v1/agents \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Agent",
    "accountId": "${accountId}",
    "description": "An AI agent on the Sly network"
  }'

# Your agent card is auto-published at:
# https://api.getsly.ai/a2a/<agent_id>/.well-known/agent.json
#
# Other agents discover and interact with you at:
# https://api.getsly.ai/a2a/<agent_id>`,
      };
    case 'sdk':
      return {
        language: 'typescript',
        code: `npm install @sly/sdk

import { Sly } from '@sly/sdk';

const sly = new Sly({ apiKey: '${apiKey}' });

// Register an agent
const agent = await sly.createAgent({
  name: 'My Agent',
  accountId: '${accountId}',
  description: 'An AI agent on the Sly network',
});

// List wallets
const wallets = await sly.listWallets();`,
      };
    case 'api':
      return {
        language: 'bash',
        code: `# Register an agent
curl -X POST https://api.getsly.ai/v1/agents \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Agent", "accountId": "${accountId}"}'

# List wallets
curl https://api.getsly.ai/v1/wallets \\
  -H "Authorization: Bearer ${apiKey}"

# Docs: https://docs.getsly.ai`,
      };
    case 'skills':
      return {
        language: 'markdown',
        code: `# My Agent

A brief description of what your agent does.

## Skills

### process_payment
- Price: 0.01 USDC
- Input: { "to": "string", "amount": "number" }
- Description: Send a USDC payment to another agent

### check_balance
- Price: free
- Input: { "wallet_id": "string" }
- Description: Check wallet balance

## Capabilities
- streaming: true
- multiTurn: true

## Auth
api_key: ${apiKey}
endpoint: https://api.getsly.ai/a2a/<agent_id>`,
      };
  }
}

const methodHints: Record<IntegrationMethod, string> = {
  mcp: 'Agent auto-registers on first connection. All payment tools become available instantly.',
  a2a: 'Your agent card is auto-published at /.well-known/agent.json for other agents to discover.',
  sdk: 'Full TypeScript SDK with typed methods for agent registration, wallets, and payments.',
  api: 'Works with any language or platform. Base URL: https://api.getsly.ai',
  skills: 'Add this to your repo. Other agents discover your skills and pay via x402 micropayments.',
};

export function IntegrationStep({ apiKeys, accountId, onComplete }: IntegrationStepProps) {
  const [selected, setSelected] = useState<IntegrationMethod | null>(null);
  const [mcpTab, setMcpTab] = useState<'claude' | 'chatgpt' | 'gemini'>('claude');
  const [showCelebration, setShowCelebration] = useState(false);

  const apiKey = apiKeys?.test.key || 'pk_test_...';
  const acctId = accountId || '<account_id>';

  const handleComplete = useCallback(() => {
    setShowCelebration(true);
  }, []);

  const handleCelebrationDone = useCallback(() => {
    setShowCelebration(false);
    onComplete();
  }, [onComplete]);

  return (
    <>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="w-full max-w-lg mx-auto space-y-6"
      >
        {/* Bot icon with ring-draw animation */}
        <motion.div variants={fadeUp} className="flex justify-center">
          <div className="relative">
            <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0">
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="url(#botGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="botGradient" x1="0" y1="0" x2="64" y2="64">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Bot className="h-7 w-7 text-purple-400" />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeUp} className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Connect Your Agent</h2>
          <p className="text-sm text-white/50">
            Pick a method to connect your AI agent. It will self-register on first use.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!selected ? (
            /* Method picker grid */
            <motion.div
              key="picker"
              variants={stagger}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {methods.map((method, i) => {
                const Icon = method.icon;
                const colors = accentColors[method.accent];

                return (
                  <motion.button
                    key={method.id}
                    variants={fadeUp}
                    onClick={() => setSelected(method.id)}
                    className={`group text-left bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 transition-all hover:scale-[1.02] ${colors.border} ${
                      // Last card spans full width if odd count
                      i === methods.length - 1 && methods.length % 2 === 1
                        ? 'sm:col-span-2'
                        : ''
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg}`}>
                        <Icon className={`h-4.5 w-4.5 ${colors.icon}`} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/0 group-hover:text-white/40 transition-all group-hover:translate-x-0.5" />
                    </div>
                    <div className="font-medium text-sm text-white mb-1">{method.label}</div>
                    <div className="text-xs text-white/40 mb-3">{method.desc}</div>
                    <div className="flex gap-1 flex-wrap">
                      {method.logos.map((l) => (
                        <span
                          key={l}
                          className="text-[10px] px-1.5 py-0.5 bg-white/[0.05] rounded-full text-white/30 border border-white/[0.05]"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            /* Detail view */
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <button
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to methods
              </button>

              {/* MCP sub-tabs for Claude/ChatGPT/Gemini */}
              {selected === 'mcp' && (
                <div className="flex gap-1 p-1 bg-white/[0.04] rounded-lg mb-3">
                  {([
                    { id: 'claude' as const, label: 'Claude' },
                    { id: 'chatgpt' as const, label: 'ChatGPT' },
                    { id: 'gemini' as const, label: 'Gemini' },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setMcpTab(tab.id)}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                        mcpTab === tab.id
                          ? 'bg-white/[0.1] text-white'
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-sm text-white/50 mb-2">
                {selected === 'mcp' && mcpTab === 'claude' && (
                  <>
                    Add to your{' '}
                    <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-white/70">
                      .mcp.json
                    </code>{' '}
                    or Claude Desktop config:
                  </>
                )}
                {selected === 'mcp' && mcpTab === 'chatgpt' && 'Create a Custom GPT with Sly actions:'}
                {selected === 'mcp' && mcpTab === 'gemini' && 'Connect Gemini via MCP:'}
                {selected === 'a2a' && 'Register your agent for A2A discovery:'}
                {selected === 'sdk' && 'Install the SDK and register your agent:'}
                {selected === 'api' && 'Use the REST API from any language:'}
                {selected === 'skills' && (
                  <>
                    Create a{' '}
                    <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-white/70">
                      skills.md
                    </code>{' '}
                    for your agent card:
                  </>
                )}
              </div>

              <CodeBlock
                {...getCodeContent(
                  selected,
                  apiKey,
                  acctId,
                  selected === 'mcp' ? mcpTab : undefined,
                )}
              />

              <p className="text-xs text-white/30">{methodHints[selected]}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Go to Dashboard */}
        <motion.div variants={fadeUp}>
          <GlowButton className="w-full" onClick={handleComplete}>
            Go to Dashboard
          </GlowButton>
        </motion.div>
      </motion.div>

      {/* Celebration overlay */}
      {showCelebration && <Celebration onComplete={handleCelebrationDone} />}
    </>
  );
}
