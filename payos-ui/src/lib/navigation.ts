/**
 * Navigation helper utilities for Next.js App Router
 * Maps old Page types to new routes
 */

export type LegacyPage = 
  | 'home' 
  | 'accounts' 
  | 'account-detail'
  | 'transactions' 
  | 'transaction-detail'
  | 'cards'
  | 'card-detail'
  | 'compliance'
  | 'compliance-flag-detail'
  | 'treasury'
  | 'agents'
  | 'agent-detail'
  | 'api-keys'
  | 'webhooks'
  | 'request-logs'
  | 'templates'
  | 'verification-tiers'
  | 'agent-verification-tiers'
  | 'reports'
  | 'settings';

export function legacyPageToRoute(page: LegacyPage, id?: string): string {
  const routeMap: Record<LegacyPage, string> = {
    'home': '/',
    'accounts': '/accounts',
    'account-detail': `/accounts/${id || 'acc_001'}`,
    'transactions': '/transactions',
    'transaction-detail': `/transactions/${id || 'tx_001'}`,
    'cards': '/cards',
    'card-detail': `/cards/${id || 'card_001'}`,
    'compliance': '/compliance',
    'compliance-flag-detail': `/compliance/${id || 'flag_001'}`,
    'treasury': '/treasury',
    'agents': '/agents',
    'agent-detail': `/agents/${id || 'ag_001'}`,
    'api-keys': '/api-keys',
    'webhooks': '/webhooks',
    'request-logs': '/request-logs',
    'templates': '/templates',
    'verification-tiers': '/verification-tiers',
    'agent-verification-tiers': '/agent-verification-tiers',
    'reports': '/reports',
    'settings': '/settings',
  };

  return routeMap[page];
}
