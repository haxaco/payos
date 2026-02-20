/**
 * A2A Agent Card Generator
 *
 * Generates A2A-compliant Agent Cards for registered Sly agents.
 * Maps agent permissions to A2A skills and declares payment capabilities.
 *
 * @see Epic 57: Google A2A Protocol Integration
 */

import type { A2AAgentCard, A2ASkill, A2AExtension } from './types.js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface AgentRecord {
  id: string;
  name: string;
  description?: string;
  status: string;
  kya_tier: number;
  permissions?: Record<string, string[]>;
}

interface AccountRecord {
  id: string;
  name: string;
}

interface WalletRecord {
  id: string;
  currency: string;
}

/**
 * Generate a per-agent A2A Agent Card from a Sly agent record.
 */
export function generateAgentCard(
  agent: AgentRecord,
  account: AccountRecord,
  wallet?: WalletRecord | null,
): A2AAgentCard {
  const skills = buildSkills(agent);
  const extensions = buildExtensions(agent, wallet);

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description || `Sly agent managed by ${account.name}`,
    version: '1.0.0',
    provider: {
      organization: 'Sly',
      url: 'https://sly.dev',
      contactEmail: 'support@sly.dev',
    },
    capabilities: {
      streaming: false,
      multiTurn: true,
      stateTransitionHistory: true,
    },
    skills,
    interfaces: [
      {
        type: 'jsonrpc',
        url: `${BASE_URL}/a2a/${agent.id}`,
        contentTypes: ['application/json'],
      },
    ],
    securitySchemes: {
      sly_api_key: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
      bearer: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    security: [
      { sly_api_key: [] },
      { bearer: [] },
    ],
    extensions,
  };
}

/**
 * Generate the Sly platform Agent Card (for /.well-known/agent.json).
 */
export function generatePlatformCard(): A2AAgentCard {
  return {
    id: 'sly-platform',
    name: 'Sly Payment Platform',
    description: 'Universal agentic payment orchestration for LATAM',
    version: '1.0.0',
    provider: {
      organization: 'Sly',
      url: 'https://sly.dev',
      contactEmail: 'support@sly.dev',
    },
    capabilities: {
      streaming: false,
      multiTurn: true,
      stateTransitionHistory: true,
    },
    skills: [
      {
        id: 'make_payment',
        name: 'Make Payment',
        description: 'Execute a stablecoin or fiat payment via multiple rails (x402, Pix, SPEI)',
        tags: ['payments', 'stablecoin', 'latam'],
      },
      {
        id: 'create_mandate',
        name: 'Create Payment Mandate',
        description: 'Create an AP2 mandate for recurring or automated agent payments',
        tags: ['payments', 'mandates', 'ap2'],
      },
      {
        id: 'manage_wallet',
        name: 'Manage Wallet',
        description: 'Deposit, withdraw, and check balances on stablecoin wallets',
        tags: ['wallets', 'stablecoin'],
      },
    ],
    interfaces: [
      {
        type: 'jsonrpc',
        url: `${BASE_URL}/a2a`,
        contentTypes: ['application/json'],
      },
    ],
    securitySchemes: {
      sly_api_key: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      },
      bearer: {
        type: 'http',
        scheme: 'bearer',
      },
    },
    security: [
      { sly_api_key: [] },
      { bearer: [] },
    ],
    extensions: [
      {
        uri: 'urn:a2a:ext:x402',
        data: {
          currencies: ['USDC'],
          rails: ['x402', 'pix', 'spei'],
        },
      },
      {
        uri: 'urn:a2a:ext:ap2',
        data: {
          mandateEndpoint: `${BASE_URL}/v1/ap2/mandates`,
        },
      },
    ],
  };
}

/**
 * Check if a permission is enabled.
 * Permissions can be stored as:
 *   - { category: { perm: true } }  (object with boolean values)
 *   - { category: ['perm1', 'perm2'] }  (array of strings)
 */
function hasPerm(perms: Record<string, any>, category: string, perm: string): boolean {
  const cat = perms[category];
  if (!cat) return false;
  if (Array.isArray(cat)) return cat.includes(perm);
  if (typeof cat === 'object') return !!cat[perm];
  return false;
}

/**
 * Build A2A skills from agent permissions.
 */
function buildSkills(agent: AgentRecord): A2ASkill[] {
  const skills: A2ASkill[] = [];
  const perms = agent.permissions || {};

  // Transaction skills
  if (hasPerm(perms, 'transactions', 'initiate')) {
    skills.push({
      id: 'make_payment',
      name: 'Make Payment',
      description: 'Initiate a payment transfer',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Payment amount' },
          currency: { type: 'string', description: 'Currency code (USDC, USD, BRL, MXN)' },
          destination: { type: 'string', description: 'Destination account or address' },
          description: { type: 'string', description: 'Payment description' },
        },
        required: ['amount', 'currency', 'destination'],
      },
      tags: ['payments'],
    });
  }

  if (hasPerm(perms, 'transactions', 'view')) {
    skills.push({
      id: 'check_balance',
      name: 'Check Balance',
      description: 'Check wallet or account balance',
      tags: ['wallets', 'balance'],
    });
  }

  // Stream skills
  if (hasPerm(perms, 'streams', 'create') || hasPerm(perms, 'streams', 'initiate')) {
    skills.push({
      id: 'create_stream',
      name: 'Create Payment Stream',
      description: 'Create a real-time per-second payment stream',
      inputSchema: {
        type: 'object',
        properties: {
          recipient: { type: 'string', description: 'Stream recipient' },
          flowRate: { type: 'number', description: 'Flow rate per second in USDC' },
          duration: { type: 'number', description: 'Duration in seconds' },
        },
        required: ['recipient', 'flowRate'],
      },
      tags: ['streams', 'payments'],
    });
  }

  // Account skills
  if (hasPerm(perms, 'accounts', 'view')) {
    skills.push({
      id: 'lookup_account',
      name: 'Lookup Account',
      description: 'Look up account details and verification status',
      tags: ['accounts'],
    });
  }

  // Always include a basic info skill
  skills.push({
    id: 'agent_info',
    name: 'Agent Info',
    description: 'Get this agent\'s capabilities and status',
    tags: ['info'],
  });

  return skills;
}

/**
 * Build A2A extensions (payment capabilities).
 */
function buildExtensions(
  agent: AgentRecord,
  wallet?: WalletRecord | null,
): A2AExtension[] {
  const extensions: A2AExtension[] = [];

  // x402 payment extension for agents with wallets
  if (wallet) {
    extensions.push({
      uri: 'urn:a2a:ext:x402',
      data: {
        walletId: wallet.id,
        currency: wallet.currency,
        paymentEndpoint: `${BASE_URL}/v1/x402/pay`,
        verifyEndpoint: `${BASE_URL}/v1/x402/verify`,
      },
    });
  }

  // AP2 mandate extension
  extensions.push({
    uri: 'urn:a2a:ext:ap2',
    data: {
      mandateEndpoint: `${BASE_URL}/v1/ap2/mandates`,
      agentId: agent.id,
    },
  });

  return extensions;
}
