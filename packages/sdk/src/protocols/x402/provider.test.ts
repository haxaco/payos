import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayOSX402Provider } from './provider';
import type { Request, Response } from 'express';

describe('PayOSX402Provider', () => {
  let provider: PayOSX402Provider;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new PayOSX402Provider({
      apiKey: 'test_key',
      environment: 'sandbox',
      routes: {
        'GET /api/premium': {
          price: '0.01',
          description: 'Premium content',
        },
        'POST /api/generate': {
          price: '0.05',
          description: 'AI generation',
        },
      },
    });

    mockReq = {
      method: 'GET',
      path: '/api/premium',
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('constructor', () => {
    it('should create provider with routes', () => {
      expect(provider).toBeInstanceOf(PayOSX402Provider);
    });

    it('should initialize sandbox facilitator in sandbox mode', () => {
      const sandboxProvider = new PayOSX402Provider({
        apiKey: 'test_key',
        environment: 'sandbox',
        routes: {
          'GET /test': { price: '0.01' },
        },
      });

      expect(sandboxProvider).toBeInstanceOf(PayOSX402Provider);
    });
  });

  describe('middleware - unprotected routes', () => {
    it('should pass through unprotected routes', async () => {
      mockReq.path = '/api/free';

      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('middleware - protected routes without payment', () => {
    it('should return 402 for protected route without payment', async () => {
      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 402,
          message: 'Payment Required',
          accepts: expect.arrayContaining([
            expect.objectContaining({
              scheme: 'exact-evm',
              amount: '0.01',
              token: 'USDC',
            }),
          ]),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should include route description in 402 response', async () => {
      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accepts: expect.arrayContaining([
            expect.objectContaining({
              description: 'Premium content',
            }),
          ]),
        })
      );
    });

    it('should return 402 for POST route', async () => {
      mockReq.method = 'POST';
      mockReq.path = '/api/generate';

      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accepts: expect.arrayContaining([
            expect.objectContaining({
              amount: '0.05',
            }),
          ]),
        })
      );
    });
  });

  describe('middleware - protected routes with valid payment', () => {
    it('should accept valid payment and call next', async () => {
      const payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      mockReq.headers = {
        'x-payment': JSON.stringify(payment),
      };

      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject payment with wrong amount', async () => {
      const payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.02', // Wrong amount
        token: 'USDC',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      mockReq.headers = {
        'x-payment': JSON.stringify(payment),
      };

      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject payment with wrong token', async () => {
      const payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'DAI', // Wrong token
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      mockReq.headers = {
        'x-payment': JSON.stringify(payment),
      };

      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed payment header', async () => {
      mockReq.headers = {
        'x-payment': 'invalid json',
      };

      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('route matching', () => {
    it('should match exact routes', async () => {
      mockReq.method = 'GET';
      mockReq.path = '/api/premium';

      const middleware = provider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
    });

    it('should support wildcard routes', async () => {
      const wildcardProvider = new PayOSX402Provider({
        apiKey: 'test_key',
        environment: 'sandbox',
        routes: {
          'GET /api/*': { price: '0.01' },
        },
      });

      mockReq.path = '/api/anything';

      const middleware = wildcardProvider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(402);
    });
  });

  describe('custom token', () => {
    it('should support custom token in route config', async () => {
      const customProvider = new PayOSX402Provider({
        apiKey: 'test_key',
        environment: 'sandbox',
        routes: {
          'GET /api/premium': {
            price: '0.01',
            token: 'DAI',
          },
        },
      });

      const middleware = customProvider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accepts: expect.arrayContaining([
            expect.objectContaining({
              token: 'DAI',
            }),
          ]),
        })
      );
    });

    it('should verify payment with custom token', async () => {
      const customProvider = new PayOSX402Provider({
        apiKey: 'test_key',
        environment: 'sandbox',
        routes: {
          'GET /api/premium': {
            price: '0.01',
            token: 'DAI',
          },
        },
      });

      const payment = {
        scheme: 'exact-evm',
        network: 'eip155:8453',
        amount: '0.01',
        token: 'DAI',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      };

      mockReq.headers = {
        'x-payment': JSON.stringify(payment),
      };

      const middleware = customProvider.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

