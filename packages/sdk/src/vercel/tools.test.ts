/**
 * Tests for Vercel AI SDK tools
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPayOSVercelTools, PAYOS_VERCEL_SYSTEM_PROMPT } from './tools';
import { PayOS } from '../index';

describe('Vercel AI SDK Tools', () => {
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

  describe('createPayOSVercelTools', () => {
    it('should create tools object', () => {
      const tools = createPayOSVercelTools(payos);

      expect(tools).toBeDefined();
      expect(tools.get_settlement_quote).toBeDefined();
      expect(tools.create_settlement).toBeDefined();
      expect(tools.get_settlement_status).toBeDefined();
      expect(tools.check_compliance).toBeDefined();
    });

    it('should have Vercel AI SDK tool structure', () => {
      const tools = createPayOSVercelTools(payos);
      const quoteTool = tools.get_settlement_quote;

      // Vercel AI SDK tools have description, parameters, execute
      expect(quoteTool.description).toBeDefined();
      expect(quoteTool.parameters).toBeDefined();
      expect(quoteTool.execute).toBeInstanceOf(Function);
    });
  });

  describe('get_settlement_quote tool', () => {
    it('should execute and return success', async () => {
      const tools = createPayOSVercelTools(payos);
      
      const result = await tools.get_settlement_quote.execute({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'API Error' }),
      } as Response);

      const tools = createPayOSVercelTools(payos);
      
      const result = await tools.get_settlement_quote.execute({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate parameters with Zod schema', () => {
      const tools = createPayOSVercelTools(payos);
      const schema = tools.get_settlement_quote.parameters;

      // Valid input
      expect(() => schema.parse({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      })).not.toThrow();

      // Invalid currency
      expect(() => schema.parse({
        fromCurrency: 'INVALID',
        toCurrency: 'BRL',
        amount: '100',
      })).toThrow();
    });
  });

  describe('create_settlement tool', () => {
    it('should execute and return success', async () => {
      const tools = createPayOSVercelTools(payos);
      
      const result = await tools.create_settlement.execute({
        quoteId: 'quote_123',
        destinationAccountId: 'acct_123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Quote expired' }),
      } as Response);

      const tools = createPayOSVercelTools(payos);
      
      const result = await tools.create_settlement.execute({
        quoteId: 'quote_123',
        destinationAccountId: 'acct_123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Quote expired');
    });
  });

  describe('get_settlement_status tool', () => {
    it('should execute and return success', async () => {
      const tools = createPayOSVercelTools(payos);
      
      const result = await tools.get_settlement_status.execute({
        settlementId: 'settlement_123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('check_compliance tool', () => {
    it('should execute and return success', async () => {
      const tools = createPayOSVercelTools(payos);
      
      const result = await tools.check_compliance.execute({
        recipientAccountId: 'acct_123',
        amount: '100',
        currency: 'USD',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should validate currency enum', () => {
      const tools = createPayOSVercelTools(payos);
      const schema = tools.check_compliance.parameters;

      // Valid currencies
      expect(() => schema.parse({
        recipientAccountId: 'acct_123',
        amount: '100',
        currency: 'USD',
      })).not.toThrow();

      expect(() => schema.parse({
        recipientAccountId: 'acct_123',
        amount: '100',
        currency: 'BRL',
      })).not.toThrow();

      // Invalid currency
      expect(() => schema.parse({
        recipientAccountId: 'acct_123',
        amount: '100',
        currency: 'USDC',
      })).toThrow();
    });
  });

  describe('System prompt', () => {
    it('should have system prompt defined', () => {
      expect(PAYOS_VERCEL_SYSTEM_PROMPT).toBeDefined();
      expect(PAYOS_VERCEL_SYSTEM_PROMPT).toContain('PayOS');
      expect(PAYOS_VERCEL_SYSTEM_PROMPT).toContain('settlement');
    });

    it('should mention payment rails', () => {
      expect(PAYOS_VERCEL_SYSTEM_PROMPT).toContain('Pix');
      expect(PAYOS_VERCEL_SYSTEM_PROMPT).toContain('SPEI');
      expect(PAYOS_VERCEL_SYSTEM_PROMPT).toContain('Wire');
      expect(PAYOS_VERCEL_SYSTEM_PROMPT).toContain('USDC');
    });
  });

  describe('Tool responses', () => {
    it('should return consistent success/error structure', async () => {
      const tools = createPayOSVercelTools(payos);
      
      const successResult = await tools.get_settlement_quote.execute({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      });

      expect(successResult).toHaveProperty('success');
      expect(successResult).toHaveProperty('data');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Error' }),
      } as Response);

      const errorResult = await tools.get_settlement_quote.execute({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
      });

      expect(errorResult).toHaveProperty('success');
      expect(errorResult).toHaveProperty('error');
    });
  });
});

