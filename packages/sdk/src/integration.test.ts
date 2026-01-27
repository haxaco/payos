/**
 * Integration tests for @sly/sdk
 * 
 * These tests validate end-to-end workflows and component integration.
 * They use the real SDK components but mock network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayOS } from './index';
import type { CapabilitiesResponse } from './types';

describe('SDK Integration Tests', () => {
  let payos: PayOS;
  
  beforeEach(() => {
    payos = new PayOS({
      apiKey: 'payos_sandbox_test_key',
      environment: 'sandbox',
    });

    // Mock fetch for all tests
    global.fetch = vi.fn();
  });

  describe('1. SDK Initialization', () => {
    it('should initialize with valid config', () => {
      expect(payos).toBeDefined();
      expect(payos.x402).toBeDefined();
      expect(payos.ap2).toBeDefined();
      expect(payos.acp).toBeDefined();
      expect(payos.capabilities).toBeDefined();
      expect(payos.langchain).toBeDefined();
    });

    it('should have access to all protocol clients', () => {
      const x402Client = payos.x402.createClient();
      expect(x402Client).toBeDefined();

      expect(payos.ap2.createMandate).toBeDefined();
      expect(payos.acp.createCheckout).toBeDefined();
    });

    it('should throw for invalid API key', () => {
      expect(() => new PayOS({
        apiKey: '',
        environment: 'sandbox',
      })).toThrow();
    });
  });

  describe('2. Cross-Protocol Workflows', () => {
    it('should use capabilities to discover available operations', async () => {
      const mockCapabilities: CapabilitiesResponse = {
        apiVersion: '1.0',
        capabilities: [
          {
            name: 'create_settlement',
            description: 'Create settlement',
            category: 'payments',
            parameters: { type: 'object', properties: {} },
            response: { type: 'object' },
            auth_required: true,
            rate_limit: '100/min',
            errors: [],
            supportsSimulation: true,
            supportsIdempotency: true,
          },
        ],
        limits: { rateLimit: '1000/hour', maxTransfer: '100000' },
        supportedCurrencies: ['USD', 'BRL'],
        supportedRails: ['pix', 'spei'],
        webhookEvents: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCapabilities,
      });

      const response = await payos.capabilities.getAll();
      expect(response.capabilities).toHaveLength(1);
      expect(response.capabilities[0].name).toBe('create_settlement');
    });

    it('should convert capabilities to multiple AI formats', async () => {
      const mockCapabilities: CapabilitiesResponse = {
        apiVersion: '1.0',
        capabilities: [
          {
            name: 'create_settlement',
            description: 'Create settlement',
            category: 'payments',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number', description: 'Amount' },
              },
              required: ['amount'],
            },
            response: { type: 'object' },
            auth_required: true,
            rate_limit: '100/min',
            errors: [],
            supportsSimulation: true,
            supportsIdempotency: true,
          },
        ],
        limits: { rateLimit: '1000/hour', maxTransfer: '100000' },
        supportedCurrencies: ['USD'],
        supportedRails: ['pix'],
        webhookEvents: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCapabilities,
      });

      const openai = await payos.capabilities.toOpenAIFunctions();
      const claude = await payos.capabilities.toClaudeTools();

      expect(openai).toHaveLength(1);
      expect(claude).toHaveLength(1);
      expect(openai[0].function.name).toBe('create_settlement');
      expect(claude[0].name).toBe('create_settlement');
    });
  });

  describe('3. AP2 Mandate Lifecycle', () => {
    it('should create → execute → check status → cancel', async () => {
      // Mock mandate creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'mandate_123',
            mandate_id: 'agent_mandate_1',
            status: 'active',
            authorized_amount: 100,
            used_amount: 0,
            remaining_amount: 100,
            execution_count: 0,
          },
        }),
      });

      const mandate = await payos.ap2.createMandate({
        mandate_id: 'agent_mandate_1',
        mandate_type: 'payment',
        agent_id: 'agent_xyz',
        account_id: 'acc_123',
        authorized_amount: 100,
        currency: 'USD',
      });

      expect(mandate.id).toBe('mandate_123');
      expect(mandate.status).toBe('active');

      // Mock execution
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            execution_id: 'exec_1',
            transfer_id: 'transfer_1',
            mandate: {
              remaining_amount: 90,
              used_amount: 10,
              execution_count: 1,
            },
            transfer: {
              id: 'transfer_1',
              amount: 10,
              currency: 'USD',
              status: 'completed',
            },
          },
        }),
      });

      const execution = await payos.ap2.executeMandate('mandate_123', {
        amount: 10,
        currency: 'USD',
      });

      expect(execution.transfer_id).toBe('transfer_1');
      expect(execution.mandate.remaining_amount).toBe(90);

      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'mandate_123',
            status: 'active',
            used_amount: 10,
            remaining_amount: 90,
            execution_count: 1,
            executions: [
              {
                id: 'exec_1',
                amount: 10,
                status: 'completed',
              },
            ],
          },
        }),
      });

      const mandateStatus = await payos.ap2.getMandate('mandate_123');
      expect(mandateStatus.used_amount).toBe(10);
      expect(mandateStatus.execution_count).toBe(1);

      // Mock cancellation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'mandate_123',
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          },
        }),
      });

      const cancelled = await payos.ap2.cancelMandate('mandate_123');
      expect(cancelled.status).toBe('cancelled');
    });

    it('should enforce mandate limits', async () => {
      // Mock mandate with $50 limit
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'mandate_limited',
            authorized_amount: 50,
            remaining_amount: 50,
            status: 'active',
          },
        }),
      });

      const mandate = await payos.ap2.createMandate({
        mandate_id: 'limited_mandate',
        mandate_type: 'payment',
        agent_id: 'agent_xyz',
        account_id: 'acc_123',
        authorized_amount: 50,
        currency: 'USD',
      });

      // Mock execution that exceeds limit
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'Amount exceeds remaining mandate authorization',
        }),
      });

      await expect(
        payos.ap2.executeMandate('mandate_limited', {
          amount: 60, // Exceeds $50 limit
          currency: 'USD',
        })
      ).rejects.toThrow();
    });
  });

  describe('4. ACP Checkout Flow', () => {
    it('should create → retrieve → complete checkout', async () => {
      // Mock checkout creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'chk_123',
            checkout_id: 'agent_checkout_1',
            status: 'pending',
            subtotal: 90,
            tax_amount: 5,
            shipping_amount: 5,
            total_amount: 100,
            currency: 'USD',
            items: [
              {
                id: 'item_1',
                name: 'API Credits',
                quantity: 100,
                unit_price: 0.9,
                total_price: 90,
              },
            ],
          },
        }),
      });

      const checkout = await payos.acp.createCheckout({
        checkout_id: 'agent_checkout_1',
        agent_id: 'agent_xyz',
        account_id: 'acc_123',
        merchant_id: 'merchant_abc',
        items: [
          {
            name: 'API Credits',
            quantity: 100,
            unit_price: 0.9,
            total_price: 90,
          },
        ],
        tax_amount: 5,
        shipping_amount: 5,
      });

      expect(checkout.id).toBe('chk_123');
      expect(checkout.total_amount).toBe(100);
      expect(checkout.items).toHaveLength(1);

      // Mock checkout retrieval
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: checkout,
        }),
      });

      const retrieved = await payos.acp.getCheckout('chk_123');
      expect(retrieved.id).toBe(checkout.id);

      // Mock completion
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            checkout_id: 'chk_123',
            transfer_id: 'transfer_123',
            status: 'completed',
            completed_at: new Date().toISOString(),
            total_amount: 100,
            currency: 'USD',
          },
        }),
      });

      const completed = await payos.acp.completeCheckout('chk_123', {
        shared_payment_token: 'spt_abc123',
      });

      expect(completed.status).toBe('completed');
      expect(completed.transfer_id).toBe('transfer_123');
    });
  });

  describe('5. Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        payos.getSettlement('settlement_123')
      ).rejects.toThrow('Network error');
    });

    it('should handle 401 Unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid API key' }),
      });

      await expect(
        payos.getSettlement('settlement_123')
      ).rejects.toThrow('Invalid API key');
    });

    it('should handle 404 Not Found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Settlement not found' }),
      });

      await expect(
        payos.getSettlement('nonexistent')
      ).rejects.toThrow('Settlement not found');
    });

    it('should handle 429 Rate Limited', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit exceeded' }),
      });

      await expect(
        payos.getSettlement('settlement_123')
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('6. Multi-Protocol Settlement Flow', () => {
    it('should check compliance → get quote → create settlement', async () => {
      // 1. Check compliance
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'approved',
          details: 'Recipient verified',
        }),
      });

      const compliance = await payos.checkCompliance({
        recipientAccountId: 'acc_brazil_123',
        amount: '100',
        currency: 'USD',
      });

      expect(compliance.status).toBe('approved');

      // 2. Get quote
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quote_id: 'quote_123',
          source_amount: 100,
          source_currency: 'USD',
          target_amount: 500.25,
          target_currency: 'BRL',
          exchange_rate: 5.0025,
          fee_amount: 0.5,
          expires_at: new Date(Date.now() + 60000).toISOString(),
        }),
      });

      const quote = await payos.getSettlementQuote({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        amount: '100',
        rail: 'pix',
      });

      expect(quote.quote_id).toBe('quote_123');
      expect(quote.target_amount).toBe(500.25);

      // 3. Create settlement
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settlement_id: 'settlement_123',
          status: 'pending',
          amount: 500.25,
          currency: 'BRL',
          recipient_id: 'acc_brazil_123',
          quote_id: 'quote_123',
          created_at: new Date().toISOString(),
        }),
      });

      const settlement = await payos.createSettlement({
        quoteId: 'quote_123',
        destinationAccountId: 'acc_brazil_123',
        metadata: { purpose: 'supplier_payment' },
      });

      expect(settlement.settlement_id).toBe('settlement_123');
      expect(settlement.quote_id).toBe('quote_123');
    });
  });

  describe('7. AI Agent Integration Patterns', () => {
    it('should support OpenAI function calling pattern', async () => {
      const mockCapabilities: CapabilitiesResponse = {
        apiVersion: '1.0',
        capabilities: [
          {
            name: 'get_settlement_quote',
            description: 'Get settlement quote',
            category: 'payments',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                fromCurrency: { type: 'string' },
                toCurrency: { type: 'string' },
              },
              required: ['amount', 'fromCurrency', 'toCurrency'],
            },
            response: { type: 'object' },
            auth_required: true,
            rate_limit: '50/min',
            errors: [],
            supportsSimulation: true,
            supportsIdempotency: false,
          },
        ],
        limits: { rateLimit: '1000/hour', maxTransfer: '100000' },
        supportedCurrencies: ['USD', 'BRL'],
        supportedRails: ['pix'],
        webhookEvents: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCapabilities,
      });

      const openai = await payos.capabilities.toOpenAIFunctions();
      
      expect(openai[0]).toMatchObject({
        type: 'function',
        function: {
          name: 'get_settlement_quote',
          description: 'Get settlement quote',
          parameters: expect.objectContaining({
            type: 'object',
            properties: expect.any(Object),
            required: ['amount', 'fromCurrency', 'toCurrency'],
          }),
        },
      });
    });

    it('should support Claude tool calling pattern', async () => {
      const mockCapabilities: CapabilitiesResponse = {
        apiVersion: '1.0',
        capabilities: [
          {
            name: 'create_settlement',
            description: 'Create settlement',
            category: 'payments',
            parameters: {
              type: 'object',
              properties: {
                quoteId: { type: 'string' },
              },
              required: ['quoteId'],
            },
            response: { type: 'object' },
            auth_required: true,
            rate_limit: '100/min',
            errors: [],
            supportsSimulation: true,
            supportsIdempotency: true,
          },
        ],
        limits: { rateLimit: '1000/hour', maxTransfer: '100000' },
        supportedCurrencies: ['USD'],
        supportedRails: ['pix'],
        webhookEvents: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCapabilities,
      });

      const claude = await payos.capabilities.toClaudeTools();
      
      expect(claude[0]).toMatchObject({
        name: 'create_settlement',
        description: 'Create settlement',
        input_schema: expect.objectContaining({
          type: 'object',
          properties: expect.any(Object),
          required: ['quoteId'],
        }),
      });
    });
  });

  describe('8. Caching Behavior', () => {
    it('should cache capabilities for performance', async () => {
      const mockCapabilities: CapabilitiesResponse = {
        apiVersion: '1.0',
        capabilities: [],
        limits: { rateLimit: '1000/hour', maxTransfer: '100000' },
        supportedCurrencies: ['USD'],
        supportedRails: ['pix'],
        webhookEvents: [],
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockCapabilities,
      });

      // First call
      await payos.capabilities.getAll();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      await payos.capabilities.getAll();
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1

      // Force refresh
      await payos.capabilities.getAll(true);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Now 2
    });
  });
});

