/**
 * Google A2A (Agent-to-Agent) Protocol Types
 *
 * Interfaces matching the A2A protocol spec v0.3.
 * Enables inter-agent communication, task lifecycle, and paid-service workflows.
 *
 * @see Epic 57: Google A2A Protocol Integration
 * @see https://google.github.io/A2A/
 */

// =============================================================================
// Agent Card Types
// =============================================================================

export interface A2AAgentCard {
  id: string;
  name: string;
  description?: string;
  version: string;
  provider?: A2AProvider;
  capabilities: A2ACapabilities;
  skills: A2ASkill[];
  interfaces: A2AInterface[];
  securitySchemes: Record<string, A2ASecurityScheme>;
  security: Array<Record<string, string[]>>;
  extensions?: A2AExtension[];
}

export interface A2AProvider {
  organization: string;
  url?: string;
  contactEmail?: string;
}

export interface A2ACapabilities {
  streaming: boolean;
  multiTurn: boolean;
  stateTransitionHistory: boolean;
}

export interface A2ASkill {
  id: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  tags?: string[];
}

export interface A2AInterface {
  type: 'jsonrpc';
  url: string;
  contentTypes?: string[];
}

export interface A2ASecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2';
  scheme?: string; // 'bearer' for http type
  in?: string;     // 'header' for apiKey type
  name?: string;   // header name for apiKey type
}

export interface A2AExtension {
  uri: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// Task Types
// =============================================================================

export type A2ATaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'rejected';

export interface A2ATask {
  id: string;
  contextId?: string;
  status: A2ATaskStatus;
  messages: A2AMessage[];
  artifacts: A2AArtifact[];
  metadata?: Record<string, unknown>;
}

export interface A2ATaskStatus {
  state: A2ATaskState;
  message?: string;
  timestamp: string;
}

// =============================================================================
// Message Types
// =============================================================================

export interface A2AMessage {
  id: string;
  role: 'user' | 'agent';
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

export type A2APart =
  | A2ATextPart
  | A2ADataPart
  | A2AFilePart;

export interface A2ATextPart {
  kind: 'text';
  text: string;
}

export interface A2ADataPart {
  kind: 'data';
  data: Record<string, unknown>;
  mimeType?: string;
}

export interface A2AFilePart {
  kind: 'file';
  uri: string;
  mimeType?: string;
}

// =============================================================================
// Artifact Types
// =============================================================================

export interface A2AArtifact {
  id: string;
  label?: string;
  mimeType: string;
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// JSON-RPC Types
// =============================================================================

export interface A2AJsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

export interface A2AJsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: A2AJsonRpcError;
  id: string | number | null;
}

export interface A2AJsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Standard JSON-RPC error codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // A2A-specific error codes
  TASK_NOT_FOUND: -32001,
  AGENT_NOT_FOUND: -32002,
  PAYMENT_REQUIRED: -32003,
  UNAUTHORIZED: -32004,
} as const;

// =============================================================================
// Database Row Types (snake_case, matching DB schema)
// =============================================================================

export interface A2ATaskRow {
  id: string;
  tenant_id: string;
  agent_id: string;
  context_id: string | null;
  state: A2ATaskState;
  status_message: string | null;
  metadata: Record<string, unknown>;
  direction: 'inbound' | 'outbound';
  remote_agent_url: string | null;
  remote_task_id: string | null;
  a2a_session_id: string | null;
  mandate_id: string | null;
  transfer_id: string | null;
  client_agent_id: string | null;
  client_agent_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface A2AMessageRow {
  id: string;
  tenant_id: string;
  task_id: string;
  role: 'user' | 'agent';
  parts: A2APart[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface A2AArtifactRow {
  id: string;
  tenant_id: string;
  task_id: string;
  label: string | null;
  mime_type: string;
  parts: A2APart[];
  metadata: Record<string, unknown>;
  created_at: string;
}
