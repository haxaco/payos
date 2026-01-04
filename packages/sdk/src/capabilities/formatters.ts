/**
 * Formatters for converting PayOS capabilities to AI agent tool formats
 * - OpenAI function-calling format
 * - Claude tool format
 */

import { Capability, CapabilitiesResponse } from '../types';

/**
 * OpenAI function-calling schema
 * https://platform.openai.com/docs/guides/function-calling
 */
export interface OpenAIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

/**
 * Claude tool schema (Anthropic Messages API)
 * https://docs.anthropic.com/claude/docs/tool-use
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

/**
 * LangChain tool schema
 * https://js.langchain.com/docs/modules/agents/tools/
 */
export interface LangChainTool {
  name: string;
  description: string;
  schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

/**
 * Extract JSON schema from parameter string
 * Capabilities store parameters as type names like "SettlementQuoteRequest"
 * This creates a simple schema representation
 */
function createSchemaFromParameterType(paramType: string): {
  properties: Record<string, any>;
  required: string[];
} {
  // For now, create a simple generic schema
  // In a full implementation, this would introspect the actual type definitions
  return {
    properties: {
      data: {
        type: 'object',
        description: `${paramType} object`,
      },
    },
    required: ['data'],
  };
}

/**
 * Convert a PayOS capability to OpenAI function format
 */
export function toOpenAIFunction(capability: Capability): OpenAIFunction {
  const schema = typeof capability.parameters === 'string' 
    ? createSchemaFromParameterType(capability.parameters)
    : { properties: {}, required: [] };

  return {
    name: capability.name,
    description: `${capability.description}. Endpoint: ${capability.endpoint}. Errors: ${capability.errors.join(', ')}`,
    parameters: {
      type: 'object',
      properties: schema.properties,
      required: schema.required,
    },
  };
}

/**
 * Convert a PayOS capability to Claude tool format
 */
export function toClaudeTool(capability: Capability): ClaudeTool {
  const schema = typeof capability.parameters === 'string' 
    ? createSchemaFromParameterType(capability.parameters)
    : { properties: {}, required: [] };

  return {
    name: capability.name,
    description: `${capability.description}. Endpoint: ${capability.endpoint}. Possible errors: ${capability.errors.join(', ')}`,
    input_schema: {
      type: 'object',
      properties: schema.properties,
      required: schema.required,
    },
  };
}

/**
 * Convert a PayOS capability to LangChain tool format
 */
export function toLangChainTool(capability: Capability): LangChainTool {
  const schema = typeof capability.parameters === 'string' 
    ? createSchemaFromParameterType(capability.parameters)
    : { properties: {}, required: [] };

  return {
    name: capability.name,
    description: `${capability.description}. Endpoint: ${capability.endpoint}`,
    schema: {
      type: 'object',
      properties: schema.properties,
      required: schema.required,
    },
  };
}

/**
 * Convert all capabilities to OpenAI function format
 */
export function toOpenAIFunctions(capabilities: Capability[] | CapabilitiesResponse): OpenAIFunction[] {
  const caps = Array.isArray(capabilities) ? capabilities : capabilities.capabilities;
  return caps.map(toOpenAIFunction);
}

/**
 * Convert all capabilities to Claude tool format
 */
export function toClaudeTools(capabilities: Capability[] | CapabilitiesResponse): ClaudeTool[] {
  const caps = Array.isArray(capabilities) ? capabilities : capabilities.capabilities;
  return caps.map(toClaudeTool);
}

/**
 * Convert all capabilities to LangChain tool format
 */
export function toLangChainTools(capabilities: Capability[] | CapabilitiesResponse): any[] {
  const caps = Array.isArray(capabilities) ? capabilities : capabilities.capabilities;
  return caps.map(toLangChainTool);
}

/**
 * Get OpenAI function-calling system message
 */
export function getOpenAISystemMessage(): string {
  return `You are a helpful AI assistant with access to PayOS payment operations. You can help users:
- Get settlement quotes for cross-border payments
- Create settlements and transfers
- Check account balances
- Verify compliance for recipients

When a user asks about payments or transfers, use the available functions to help them. Always confirm important actions before executing them.`;
}

/**
 * Get Claude system message
 */
export function getClaudeSystemMessage(): string {
  return `You are a helpful AI assistant with access to PayOS payment operations. You can help users:
- Get settlement quotes for cross-border payments
- Create settlements and transfers
- Check account balances
- Verify compliance for recipients

When a user asks about payments or transfers, use the available tools to help them. Always confirm important actions before executing them.`;
}

