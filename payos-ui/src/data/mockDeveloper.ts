import { APIKey, Webhook, APIRequest } from '../types/developer';

export const mockAPIKeys: APIKey[] = [
  {
    id: 'key_001',
    name: 'Production - Main',
    keyPrefix: 'sk_live_7f8a',
    keyHint: '...3d4e',
    environment: 'production',
    status: 'active',
    permissions: ['read', 'write', 'admin'],
    lastUsed: '2025-12-07T14:32:00Z',
    createdAt: '2025-09-01T10:00:00Z',
    createdBy: 'diego@payos.dev',
    expiresAt: null
  },
  {
    id: 'key_002',
    name: 'Production - Agents',
    keyPrefix: 'sk_live_2a3b',
    keyHint: '...9f8e',
    environment: 'production',
    status: 'active',
    permissions: ['read', 'write'],
    lastUsed: '2025-12-07T14:45:00Z',
    createdAt: '2025-10-15T10:00:00Z',
    createdBy: 'diego@payos.dev',
    expiresAt: null
  },
  {
    id: 'key_003',
    name: 'Sandbox - Testing',
    keyPrefix: 'sk_test_4c5d',
    keyHint: '...1a2b',
    environment: 'sandbox',
    status: 'active',
    permissions: ['read', 'write', 'admin'],
    lastUsed: '2025-12-06T18:00:00Z',
    createdAt: '2025-09-01T10:00:00Z',
    createdBy: 'diego@payos.dev',
    expiresAt: null
  },
  {
    id: 'key_004',
    name: 'Old Integration Key',
    keyPrefix: 'sk_live_8e9f',
    keyHint: '...5c6d',
    environment: 'production',
    status: 'revoked',
    permissions: ['read'],
    lastUsed: '2025-11-15T12:00:00Z',
    createdAt: '2025-08-01T10:00:00Z',
    createdBy: 'federico@payos.dev',
    expiresAt: null
  }
];

export const mockWebhooks: Webhook[] = [
  {
    id: 'wh_001',
    url: 'https://api.techcorp.com/webhooks/payos',
    events: ['payment.completed', 'payment.failed', 'account.created'],
    status: 'active',
    secret: 'whsec_7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c',
    lastTriggered: '2025-12-07T14:30:00Z',
    successRate: 99.8,
    createdAt: '2025-09-15T10:00:00Z'
  },
  {
    id: 'wh_002',
    url: 'https://hooks.slack.com/services/T00/B00/XXX',
    events: ['compliance.flag.created', 'compliance.flag.resolved'],
    status: 'active',
    secret: 'whsec_2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d',
    lastTriggered: '2025-12-07T12:15:00Z',
    successRate: 100,
    createdAt: '2025-10-01T10:00:00Z'
  },
  {
    id: 'wh_003',
    url: 'https://old-service.example.com/webhook',
    events: ['payment.completed'],
    status: 'failing',
    secret: 'whsec_9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a',
    lastTriggered: '2025-12-05T09:00:00Z',
    successRate: 45.2,
    createdAt: '2025-08-01T10:00:00Z'
  }
];

export const mockAPIRequests: APIRequest[] = [
  {
    id: 'req_001',
    method: 'POST',
    endpoint: '/v1/payments',
    statusCode: 200,
    latency: 245,
    apiKeyId: 'key_002',
    apiKeyName: 'Production - Agents',
    timestamp: '2025-12-07T14:45:32Z',
    ip: '52.24.123.45'
  },
  {
    id: 'req_002',
    method: 'GET',
    endpoint: '/v1/accounts/acc_001',
    statusCode: 200,
    latency: 89,
    apiKeyId: 'key_001',
    apiKeyName: 'Production - Main',
    timestamp: '2025-12-07T14:44:18Z',
    ip: '52.24.123.45'
  },
  {
    id: 'req_003',
    method: 'POST',
    endpoint: '/v1/payments',
    statusCode: 400,
    latency: 52,
    apiKeyId: 'key_002',
    apiKeyName: 'Production - Agents',
    timestamp: '2025-12-07T14:43:55Z',
    ip: '52.24.123.45'
  },
  {
    id: 'req_004',
    method: 'GET',
    endpoint: '/v1/compliance/flags',
    statusCode: 200,
    latency: 156,
    apiKeyId: 'key_001',
    apiKeyName: 'Production - Main',
    timestamp: '2025-12-07T14:42:10Z',
    ip: '52.24.123.45'
  },
  {
    id: 'req_005',
    method: 'PUT',
    endpoint: '/v1/agents/agent_001/permissions',
    statusCode: 200,
    latency: 312,
    apiKeyId: 'key_001',
    apiKeyName: 'Production - Main',
    timestamp: '2025-12-07T14:40:00Z',
    ip: '52.24.123.45'
  },
  {
    id: 'req_006',
    method: 'POST',
    endpoint: '/v1/webhooks/test',
    statusCode: 200,
    latency: 1245,
    apiKeyId: 'key_003',
    apiKeyName: 'Sandbox - Testing',
    timestamp: '2025-12-07T14:38:22Z',
    ip: '192.168.1.100'
  },
  {
    id: 'req_007',
    method: 'DELETE',
    endpoint: '/v1/cards/card_expired_001',
    statusCode: 404,
    latency: 34,
    apiKeyId: 'key_001',
    apiKeyName: 'Production - Main',
    timestamp: '2025-12-07T14:35:00Z',
    ip: '52.24.123.45'
  }
];
