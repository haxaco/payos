export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;        // First 8 chars shown, e.g. "sk_live_7f8a"
  keyHint: string;          // Last 4 chars, e.g. "...3d4e"
  environment: 'sandbox' | 'production';
  status: 'active' | 'revoked';
  permissions: ('read' | 'write' | 'admin')[];
  lastUsed: string | null;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'failing';
  secret: string;
  lastTriggered: string | null;
  successRate: number;
  createdAt: string;
}

export interface APIRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  statusCode: number;
  latency: number;          // ms
  apiKeyId: string;
  apiKeyName: string;
  timestamp: string;
  ip: string;
}
