import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayOSX402Client } from './client';

// Mock fetch globally
global.fetch = vi.fn();

describe('PayOSX402Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset date for daily spend tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create client in sandbox mode without EVM key', () => {
      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      expect(client).toBeInstanceOf(PayOSX402Client);
    });

    it('should throw error for testnet without EVM key', () => {
      expect(() => {
        new PayOSX402Client({
          apiKey: 'test_key',
          environment: 'testnet',
        });
      }).toThrow(/EVM private key is required/);
    });

    it('should accept testnet with EVM key', () => {
      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'testnet',
        evmPrivateKey: '0x1234567890abcdef',
      });

      expect(client).toBeInstanceOf(PayOSX402Client);
    });

    it('should use custom limits', () => {
      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
        maxAutoPayAmount: '5.00',
        maxDailySpend: '500.00',
      });

      const status = client.getStatus();
      expect(status.dailyLimit).toBe('500.00');
    });
  });

  describe('fetch - non-402 responses', () => {
    it('should return response for non-402 status', async () => {
      const mockResponse = new Response('OK', { status: 200 });
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      const response = await client.fetch('https://api.example.com/free');
      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetch - 402 handling', () => {
    it('should handle 402 and retry with payment in sandbox mode', async () => {
      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '0.01',
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      const mockSuccessResponse = new Response('Premium content', { status: 200 });

      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      const response = await client.fetch('https://api.example.com/premium');

      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(2);

      // Check second call had X-Payment header
      const secondCall = vi.mocked(fetch).mock.calls[1];
      expect(secondCall[1]?.headers).toHaveProperty('X-Payment');
    });

    it('should reject payment exceeding max auto-pay amount', async () => {
      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '10.00', // Exceeds default $1 limit
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      vi.mocked(fetch).mockResolvedValueOnce(mock402Response);

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      await expect(
        client.fetch('https://api.example.com/expensive')
      ).rejects.toThrow(/exceeds max auto-pay amount/);
    });

    it('should accept payment with custom maxPayment', async () => {
      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '5.00',
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      const mockSuccessResponse = new Response('Premium content', { status: 200 });

      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      const response = await client.fetch('https://api.example.com/premium', {
        maxPayment: '10.00',
      });

      expect(response.status).toBe(200);
    });

    it('should reject payment exceeding daily limit', async () => {
      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '0.50',
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      const mockSuccessResponse = new Response('OK', { status: 200 });

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
        maxDailySpend: '1.00',
      });

      // First payment: 402 + success
      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response.clone())
        .mockResolvedValueOnce(mockSuccessResponse.clone());
      await client.fetch('https://api.example.com/premium');

      // Second payment: 402 + success
      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response.clone())
        .mockResolvedValueOnce(mockSuccessResponse.clone());
      await client.fetch('https://api.example.com/premium');

      // Third payment: 402 should fail before retry (would exceed $1 daily limit)
      vi.mocked(fetch).mockResolvedValueOnce(mock402Response.clone());
      
      await expect(
        client.fetch('https://api.example.com/premium')
      ).rejects.toThrow(/exceed daily limit/);
    });

    it('should reset daily spend on new day', async () => {
      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '0.90',
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      const mockSuccessResponse = new Response('OK', { status: 200 });

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
        maxDailySpend: '1.00',
      });

      // First payment on day 1
      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response.clone())
        .mockResolvedValueOnce(mockSuccessResponse.clone());
      await client.fetch('https://api.example.com/premium');

      // Advance to next day
      vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));

      // Should succeed because daily limit reset
      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response.clone())
        .mockResolvedValueOnce(mockSuccessResponse.clone());
      await client.fetch('https://api.example.com/premium');

      const status = client.getStatus();
      expect(parseFloat(status.dailySpent)).toBe(0.90);
    });

    it('should throw error for invalid 402 response', async () => {
      const mock402Response = new Response(
        JSON.stringify({ invalid: 'response' }),
        { status: 402 }
      );

      vi.mocked(fetch).mockResolvedValueOnce(mock402Response);

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      await expect(
        client.fetch('https://api.example.com/premium')
      ).rejects.toThrow(/Invalid 402 response/);
    });
  });

  describe('callbacks', () => {
    it('should fire onPayment callback', async () => {
      const onPayment = vi.fn();

      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '0.01',
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      const mockSuccessResponse = new Response('OK', { status: 200 });

      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
        onPayment,
      });

      await client.fetch('https://api.example.com/premium');

      expect(onPayment).toHaveBeenCalledTimes(1);
      expect(onPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '0.01',
          currency: 'USDC',
          scheme: 'exact-evm',
          network: 'eip155:8453',
        })
      );
    });

    it('should fire onSettlement callback', async () => {
      const onSettlement = vi.fn();

      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '0.01',
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      const mockSuccessResponse = new Response('OK', { status: 200 });

      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
        onSettlement,
      });

      await client.fetch('https://api.example.com/premium');

      expect(onSettlement).toHaveBeenCalledTimes(1);
      expect(onSettlement).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionHash: expect.stringMatching(/^0x[0-9a-f]{64}$/),
          amount: '0.01',
          currency: 'USDC',
        })
      );
    });
  });

  describe('getStatus', () => {
    it('should return correct status', () => {
      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
        maxDailySpend: '50.00',
      });

      const status = client.getStatus();

      expect(status.environment).toBe('sandbox');
      expect(status.dailySpent).toBe('0.00');
      expect(status.dailyLimit).toBe('50.00');
      expect(status.walletAddress).toBeDefined();
    });

    it('should track daily spent after payments', async () => {
      const mock402Response = new Response(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact-evm',
              network: 'eip155:8453',
              token: 'USDC',
              amount: '0.25',
              facilitator: 'http://localhost:4000/v1/x402/facilitator',
            },
          ],
        }),
        { status: 402 }
      );

      const mockSuccessResponse = new Response('OK', { status: 200 });

      const client = new PayOSX402Client({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      // First payment
      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response.clone())
        .mockResolvedValueOnce(mockSuccessResponse.clone());
      await client.fetch('https://api.example.com/premium');
      
      // Second payment
      vi.mocked(fetch)
        .mockResolvedValueOnce(mock402Response.clone())
        .mockResolvedValueOnce(mockSuccessResponse.clone());
      await client.fetch('https://api.example.com/premium');

      const status = client.getStatus();
      expect(status.dailySpent).toBe('0.50');
    });
  });
});

