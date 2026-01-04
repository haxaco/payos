/**
 * Tests for capability formatters
 */

import { describe, it, expect } from 'vitest';
import {
  toOpenAIFunction,
  toClaudeTool,
  toLangChainTool,
  toOpenAIFunctions,
  toClaudeTools,
  toLangChainTools,
  getOpenAISystemMessage,
  getClaudeSystemMessage,
} from './formatters';
import { Capability, CapabilitiesResponse } from '../types';

describe('Capability Formatters', () => {
  const mockCapability: Capability = {
    name: 'get_settlement_quote',
    description: 'Get a settlement quote for cross-border payment',
    category: 'settlements',
    endpoint: 'POST /v1/settlements/quote',
    parameters: 'SettlementQuoteRequest',
    returns: 'SettlementQuote',
    errors: ['INVALID_CURRENCY', 'INVALID_AMOUNT', 'RATE_UNAVAILABLE'],
    supportsSimulation: false,
    supportsIdempotency: false,
  };

  const mockCapabilities: CapabilitiesResponse = {
    apiVersion: '2025-12-01',
    capabilities: [mockCapability],
    limits: {
      rateLimit: '1000/hour',
      maxTransfer: '100000.00',
    },
    supportedCurrencies: ['USD', 'BRL', 'MXN'],
    supportedRails: ['pix', 'spei', 'wire'],
    webhookEvents: ['transfer.created'],
  };

  describe('toOpenAIFunction', () => {
    it('should convert capability to OpenAI function format', () => {
      const func = toOpenAIFunction(mockCapability);

      expect(func.name).toBe('get_settlement_quote');
      expect(func.description).toContain('Get a settlement quote');
      expect(func.description).toContain('POST /v1/settlements/quote');
      expect(func.description).toContain('INVALID_CURRENCY');
      expect(func.parameters.type).toBe('object');
      expect(func.parameters.properties).toBeDefined();
      expect(func.parameters.required).toBeDefined();
    });
  });

  describe('toClaudeTool', () => {
    it('should convert capability to Claude tool format', () => {
      const tool = toClaudeTool(mockCapability);

      expect(tool.name).toBe('get_settlement_quote');
      expect(tool.description).toContain('Get a settlement quote');
      expect(tool.description).toContain('POST /v1/settlements/quote');
      expect(tool.input_schema.type).toBe('object');
      expect(tool.input_schema.properties).toBeDefined();
      expect(tool.input_schema.required).toBeDefined();
    });
  });

  describe('toLangChainTool', () => {
    it('should convert capability to LangChain tool format', () => {
      const tool = toLangChainTool(mockCapability);

      expect(tool.name).toBe('get_settlement_quote');
      expect(tool.description).toContain('Get a settlement quote');
      expect(tool.schema.type).toBe('object');
      expect(tool.schema.properties).toBeDefined();
      expect(tool.schema.required).toBeDefined();
    });
  });

  describe('toOpenAIFunctions', () => {
    it('should convert all capabilities to OpenAI format', () => {
      const functions = toOpenAIFunctions(mockCapabilities);

      expect(functions).toHaveLength(1);
      expect(functions[0].name).toBe('get_settlement_quote');
    });
  });

  describe('toClaudeTools', () => {
    it('should convert all capabilities to Claude format', () => {
      const tools = toClaudeTools(mockCapabilities);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('get_settlement_quote');
      expect(tools[0].input_schema).toBeDefined();
    });
  });

  describe('toLangChainTools', () => {
    it('should convert all capabilities to LangChain format', () => {
      const tools = toLangChainTools(mockCapabilities);

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('get_settlement_quote');
      expect(tools[0].schema).toBeDefined();
    });
  });

  describe('System messages', () => {
    it('should return OpenAI system message', () => {
      const message = getOpenAISystemMessage();

      expect(message).toContain('PayOS');
      expect(message).toContain('settlement');
      expect(message).toContain('transfer');
    });

    it('should return Claude system message', () => {
      const message = getClaudeSystemMessage();

      expect(message).toContain('PayOS');
      expect(message).toContain('settlement');
      expect(message).toContain('transfer');
    });
  });
});

