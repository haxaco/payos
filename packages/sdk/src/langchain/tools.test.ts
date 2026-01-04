/**
 * Tests for LangChain tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPayOSLangChainTools, getPayOSLangChainTool, PAYOS_LANGCHAIN_SYSTEM_MESSAGE } from './tools';
import { PayOS } from '../index';

describe('LangChain Tools', () => {
  let payos: PayOS;

  beforeEach(() => {
    payos = new PayOS({
      apiKey: 'test-api-key',
      environment: 'sandbox',
    });

    // Mock fetch for API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test-id',
        status: 'completed',
      }),
    } as Response);
  });

  describe('createPayOSLangChainTools', () => {
    it('should create array of LangChain tools', () => {
      const tools = createPayOSLangChainTools(payos);

      expect(tools).toBeInstanceOf(Array);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('should include get_settlement_quote tool', () => {
      const tools = createPayOSLangChainTools(payos);
      const quoteTool = tools.find(t => t.name === 'get_settlement_quote');

      expect(quoteTool).toBeDefined();
      expect(quoteTool?.description).toContain('quote');
      expect(quoteTool?.schema).toBeDefined();
      expect(quoteTool?.func).toBeInstanceOf(Function);
    });

    it('should include create_settlement tool', () => {
      const tools = createPayOSLangChainTools(payos);
      const settlementTool = tools.find(t => t.name === 'create_settlement');

      expect(settlementTool).toBeDefined();
      expect(settlementTool?.description).toContain('settlement');
    });

    it('should include get_settlement_status tool', () => {
      const tools = createPayOSLangChainTools(payos);
      const statusTool = tools.find(t => t.name === 'get_settlement_status');

      expect(statusTool).toBeDefined();
      expect(statusTool?.description).toContain('status');
    });

    it('should include check_compliance tool', () => {
      const tools = createPayOSLangChainTools(payos);
      const complianceTool = tools.find(t => t.name === 'check_compliance');

      expect(complianceTool).toBeDefined();
      expect(complianceTool?.description).toContain('compliance');
    });
  });

  describe('Tool execution', () => {
    it('should execute get_settlement_quote tool', async () => {
      const tools = createPayOSLangChainTools(payos);
      const quoteTool = tools.find(t => t.name === 'get_settlement_quote');

      const result = await quoteTool?.func({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle tool execution errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'API Error' }),
      } as Response);

      const tools = createPayOSLangChainTools(payos);
      const quoteTool = tools.find(t => t.name === 'get_settlement_quote');

      const result = await quoteTool?.func({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      });

      expect(result).toContain('Error');
    });
  });

  describe('getPayOSLangChainTool', () => {
    it('should get tool by name', () => {
      const tool = getPayOSLangChainTool(payos, 'get_settlement_quote');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('get_settlement_quote');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = getPayOSLangChainTool(payos, 'non_existent_tool');

      expect(tool).toBeUndefined();
    });
  });

  describe('System message', () => {
    it('should have system message defined', () => {
      expect(PAYOS_LANGCHAIN_SYSTEM_MESSAGE).toBeDefined();
      expect(PAYOS_LANGCHAIN_SYSTEM_MESSAGE).toContain('PayOS');
      expect(PAYOS_LANGCHAIN_SYSTEM_MESSAGE).toContain('settlement');
    });

    it('should mention payment rails', () => {
      expect(PAYOS_LANGCHAIN_SYSTEM_MESSAGE).toContain('Pix');
      expect(PAYOS_LANGCHAIN_SYSTEM_MESSAGE).toContain('SPEI');
      expect(PAYOS_LANGCHAIN_SYSTEM_MESSAGE).toContain('Wire');
      expect(PAYOS_LANGCHAIN_SYSTEM_MESSAGE).toContain('USDC');
    });
  });

  describe('Tool schemas', () => {
    it('should have valid Zod schemas', () => {
      const tools = createPayOSLangChainTools(payos);

      tools.forEach(tool => {
        expect(tool.schema).toBeDefined();
        expect(tool.schema.parse).toBeInstanceOf(Function);
      });
    });

    it('should validate get_settlement_quote input', () => {
      const tools = createPayOSLangChainTools(payos);
      const quoteTool = tools.find(t => t.name === 'get_settlement_quote');

      const validInput = {
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      };

      expect(() => quoteTool?.schema.parse(validInput)).not.toThrow();
    });

    it('should reject invalid get_settlement_quote input', () => {
      const tools = createPayOSLangChainTools(payos);
      const quoteTool = tools.find(t => t.name === 'get_settlement_quote');

      const invalidInput = {
        fromCurrency: 'INVALID',
        toCurrency: 'BRL',
        amount: '100',
      };

      expect(() => quoteTool?.schema.parse(invalidInput)).toThrow();
    });
  });
});

