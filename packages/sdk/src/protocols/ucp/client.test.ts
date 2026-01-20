/**
 * Tests for UCP Client
 *
 * @see Story 43.9: UCP Client Module
 * @see Phase 5: SDK & Documentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UCPClient } from './client';
import { PayOSClient } from '../../client';
import type { PayOSConfig } from '../../config';
import type {
  UCPProfile,
  UCPCorridor,
  UCPQuote,
  UCPToken,
  UCPSettlement,
  UCPHandlerInfo,
  PayOSCheckout,
  PayOSOrder,
  UCPAuthorizationInfo,
  UCPTokenResponse,
  UCPLinkedAccount,
} from './types';

describe('UCPClient', () => {
  let ucpClient: UCPClient;
  let payosClient: PayOSClient;
  let config: PayOSConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      environment: 'sandbox',
    };
    payosClient = new PayOSClient(config);
    ucpClient = new UCPClient(payosClient);

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    ucpClient.clearCache();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Discovery Tests
  // ===========================================================================

  describe('discover', () => {
    const mockProfile: UCPProfile = {
      ucp: {
        version: '2026-01-11',
        services: {},
        capabilities: [
          { name: 'checkout', version: '1.0' },
          { name: 'orders', version: '1.0' },
        ],
      },
      business: {
        name: 'Test Merchant',
        logo_url: 'https://example.com/logo.png',
        support_email: 'support@example.com',
      },
      checkout: {
        endpoint: 'https://example.com/api/checkout',
        supported_currencies: ['USD', 'EUR'],
        payment_handlers: ['payos_latam'],
      },
    };

    it('should discover a merchant profile', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      const result = await ucpClient.discover('https://shop.example.com');

      expect(result).toEqual(mockProfile);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://shop.example.com/.well-known/ucp',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            'User-Agent': 'PayOS-SDK/1.0',
          }),
        })
      );
    });

    it('should normalize URLs with trailing slashes', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      await ucpClient.discover('https://shop.example.com/');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://shop.example.com/.well-known/ucp',
        expect.any(Object)
      );
    });

    it('should cache profile for 1 hour', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      // First call - should fetch
      await ucpClient.discover('https://shop.example.com');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await ucpClient.discover('https://shop.example.com');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error on failed discovery', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(ucpClient.discover('https://shop.example.com')).rejects.toThrow(
        'Failed to discover UCP profile: 404 Not Found'
      );
    });

    it('should throw error on invalid profile', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'profile' }),
      });

      await expect(ucpClient.discover('https://shop.example.com')).rejects.toThrow(
        'Invalid UCP profile: missing ucp.version'
      );
    });
  });

  describe('getProfile', () => {
    it('should get PayOS UCP profile', async () => {
      const mockProfile: UCPProfile = {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: [],
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      const result = await ucpClient.getProfile();

      expect(result).toEqual(mockProfile);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/.well-known/ucp'),
        expect.any(Object)
      );
    });
  });

  describe('getCorridors', () => {
    it('should list available corridors', async () => {
      const mockCorridors: UCPCorridor[] = [
        {
          id: 'usd_brl_pix',
          name: 'USD to BRL via Pix',
          source_currency: 'USD',
          destination_currency: 'BRL',
          destination_country: 'BR',
          rail: 'pix',
          estimated_settlement: '5 minutes',
        },
        {
          id: 'usd_mxn_spei',
          name: 'USD to MXN via SPEI',
          source_currency: 'USD',
          destination_currency: 'MXN',
          destination_country: 'MX',
          rail: 'spei',
          estimated_settlement: '1 hour',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ corridors: mockCorridors }),
      });

      const result = await ucpClient.getCorridors();

      expect(result).toEqual(mockCorridors);
      expect(result).toHaveLength(2);
      expect(result[0].rail).toBe('pix');
    });
  });

  describe('getHandlerInfo', () => {
    it('should get handler info', async () => {
      const mockInfo: UCPHandlerInfo = {
        handler: {
          id: 'payos_latam',
          name: 'PayOS LATAM Settlement',
          version: '1.0.0',
        },
        supported_corridors: ['usd_brl_pix', 'usd_mxn_spei'],
        supported_currencies: ['USD', 'USDC'],
        token_expiry_seconds: 900,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockInfo,
      });

      const result = await ucpClient.getHandlerInfo();

      expect(result.handler.id).toBe('payos_latam');
      expect(result.token_expiry_seconds).toBe(900);
    });
  });

  // ===========================================================================
  // Quote Tests
  // ===========================================================================

  describe('getQuote', () => {
    it('should get an FX quote', async () => {
      const mockQuote: UCPQuote = {
        from_amount: 100,
        from_currency: 'USD',
        to_amount: 595,
        to_currency: 'BRL',
        fx_rate: 5.95,
        fees: 2.5,
        expires_at: new Date(Date.now() + 300000).toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockQuote,
      });

      const result = await ucpClient.getQuote({
        corridor: 'pix',
        amount: 100,
        currency: 'USD',
      });

      expect(result.from_amount).toBe(100);
      expect(result.to_amount).toBe(595);
      expect(result.fx_rate).toBe(5.95);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ucp/quote'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // ===========================================================================
  // Token & Settlement Tests
  // ===========================================================================

  describe('acquireToken', () => {
    it('should acquire a settlement token', async () => {
      const mockToken: UCPToken = {
        token: 'ucp_tok_123456',
        settlement_id: 'set_789',
        quote: {
          from_amount: 100,
          from_currency: 'USD',
          to_amount: 595,
          to_currency: 'BRL',
          fx_rate: 5.95,
          fees: 2.5,
          expires_at: new Date(Date.now() + 900000).toISOString(),
        },
        expires_at: new Date(Date.now() + 900000).toISOString(),
        created_at: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockToken,
      });

      const result = await ucpClient.acquireToken({
        corridor: 'pix',
        amount: 100,
        currency: 'USD',
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Maria Silva',
        },
      });

      expect(result.token).toBe('ucp_tok_123456');
      expect(result.quote.to_amount).toBe(595);
    });
  });

  describe('settle', () => {
    it('should settle using a token', async () => {
      const mockSettlement: UCPSettlement = {
        id: 'set_789',
        status: 'pending',
        token: 'ucp_tok_123456',
        amount: {
          source: 100,
          source_currency: 'USD',
          destination: 595,
          destination_currency: 'BRL',
          fx_rate: 5.95,
          fees: 2.5,
        },
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Maria Silva',
        },
        corridor: 'pix',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockSettlement,
      });

      const result = await ucpClient.settle({
        token: 'ucp_tok_123456',
        idempotency_key: 'checkout_12345',
      });

      expect(result.status).toBe('pending');
      expect(result.amount.destination).toBe(595);
    });
  });

  describe('getSettlement', () => {
    it('should get settlement status', async () => {
      const mockSettlement: UCPSettlement = {
        id: 'set_789',
        status: 'completed',
        token: 'ucp_tok_123456',
        transfer_id: 'xfer_abc',
        amount: {
          source: 100,
          source_currency: 'USD',
          destination: 595,
          destination_currency: 'BRL',
          fx_rate: 5.95,
          fees: 2.5,
        },
        recipient: {
          type: 'pix',
          pix_key: '12345678901',
          pix_key_type: 'cpf',
          name: 'Maria Silva',
        },
        corridor: 'pix',
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockSettlement,
      });

      const result = await ucpClient.getSettlement('set_789');

      expect(result.status).toBe('completed');
      expect(result.transfer_id).toBe('xfer_abc');
    });
  });

  describe('listSettlements', () => {
    it('should list settlements with filters', async () => {
      const mockResponse = {
        data: [],
        pagination: { limit: 50, offset: 0, total: 0 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await ucpClient.listSettlements({
        status: 'completed',
        corridor: 'pix',
        limit: 50,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/status=completed.*corridor=pix.*limit=50/),
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // Utilities Tests
  // ===========================================================================

  describe('supportsCorridor', () => {
    it('should check corridor support', async () => {
      const mockCorridors: UCPCorridor[] = [
        {
          id: 'usd_brl_pix',
          name: 'USD to BRL via Pix',
          source_currency: 'USD',
          destination_currency: 'BRL',
          destination_country: 'BR',
          rail: 'pix',
          estimated_settlement: '5 minutes',
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ corridors: mockCorridors }),
      });

      const supported = await ucpClient.supportsCorridor('USD', 'BRL', 'pix');
      expect(supported).toBe(true);

      const notSupported = await ucpClient.supportsCorridor('EUR', 'BRL', 'pix');
      expect(notSupported).toBe(false);
    });
  });

  describe('createPixRecipient', () => {
    it('should create a Pix recipient object', () => {
      const recipient = ucpClient.createPixRecipient({
        pix_key: '12345678901',
        pix_key_type: 'cpf',
        name: 'Maria Silva',
      });

      expect(recipient).toEqual({
        type: 'pix',
        pix_key: '12345678901',
        pix_key_type: 'cpf',
        name: 'Maria Silva',
      });
    });
  });

  describe('createSpeiRecipient', () => {
    it('should create a SPEI recipient object', () => {
      const recipient = ucpClient.createSpeiRecipient({
        clabe: '012345678901234567',
        name: 'Juan Garcia',
        rfc: 'GARJ850101XXX',
      });

      expect(recipient).toEqual({
        type: 'spei',
        clabe: '012345678901234567',
        name: 'Juan Garcia',
        rfc: 'GARJ850101XXX',
      });
    });
  });

  // ===========================================================================
  // PayOS-Hosted Checkouts Tests (Phase 2)
  // ===========================================================================

  describe('checkouts', () => {
    const mockCheckout: PayOSCheckout = {
      id: 'chk_123',
      tenant_id: 'tenant_456',
      status: 'incomplete',
      currency: 'USD',
      line_items: [
        {
          id: 'item_1',
          name: 'Product 1',
          quantity: 2,
          unit_price: 5000,
          total_price: 10000,
          currency: 'USD',
        },
      ],
      totals: [
        { type: 'subtotal', amount: 10000, label: 'Subtotal' },
        { type: 'tax', amount: 500, label: 'Tax' },
        { type: 'total', amount: 10500, label: 'Total' },
      ],
      payment_config: {
        handlers: ['card', 'payos_latam'],
      },
      payment_instruments: [],
      messages: [],
      links: [],
      metadata: {},
      expires_at: new Date(Date.now() + 21600000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    describe('create', () => {
      it('should create a checkout session', async () => {
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockCheckout,
        });

        const result = await ucpClient.checkouts.create({
          currency: 'USD',
          line_items: [
            {
              id: 'item_1',
              name: 'Product 1',
              quantity: 2,
              unit_price: 5000,
              total_price: 10000,
              currency: 'USD',
            },
          ],
        });

        expect(result.id).toBe('chk_123');
        expect(result.status).toBe('incomplete');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/checkouts'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('get', () => {
      it('should get a checkout by ID', async () => {
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockCheckout,
        });

        const result = await ucpClient.checkouts.get('chk_123');

        expect(result.id).toBe('chk_123');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/checkouts/chk_123'),
          expect.any(Object)
        );
      });
    });

    describe('update', () => {
      it('should update a checkout', async () => {
        const updatedCheckout = {
          ...mockCheckout,
          buyer: { email: 'buyer@example.com', name: 'John Doe' },
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => updatedCheckout,
        });

        const result = await ucpClient.checkouts.update('chk_123', {
          buyer: { email: 'buyer@example.com', name: 'John Doe' },
        });

        expect(result.buyer?.email).toBe('buyer@example.com');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/checkouts/chk_123'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    describe('complete', () => {
      it('should complete a checkout', async () => {
        const completedCheckout: PayOSCheckout = {
          ...mockCheckout,
          status: 'completed',
          order_id: 'ord_789',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => completedCheckout,
        });

        const result = await ucpClient.checkouts.complete('chk_123');

        expect(result.status).toBe('completed');
        expect(result.order_id).toBe('ord_789');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/checkouts/chk_123/complete'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('cancel', () => {
      it('should cancel a checkout', async () => {
        const cancelledCheckout: PayOSCheckout = {
          ...mockCheckout,
          status: 'canceled',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => cancelledCheckout,
        });

        const result = await ucpClient.checkouts.cancel('chk_123');

        expect(result.status).toBe('canceled');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/checkouts/chk_123/cancel'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('addPaymentInstrument', () => {
      it('should add a payment instrument', async () => {
        const checkoutWithInstrument: PayOSCheckout = {
          ...mockCheckout,
          payment_instruments: [
            {
              id: 'instr_abc',
              handler: 'card',
              type: 'card',
              last4: '4242',
              brand: 'visa',
              created_at: new Date().toISOString(),
            },
          ],
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => checkoutWithInstrument,
        });

        const result = await ucpClient.checkouts.addPaymentInstrument('chk_123', {
          id: 'instr_abc',
          handler: 'card',
          type: 'card',
          last4: '4242',
          brand: 'visa',
        });

        expect(result.payment_instruments).toHaveLength(1);
        expect(result.payment_instruments[0].last4).toBe('4242');
      });
    });
  });

  // ===========================================================================
  // PayOS Orders Tests (Phase 3)
  // ===========================================================================

  describe('orders', () => {
    const mockOrder: PayOSOrder = {
      id: 'ord_789',
      tenant_id: 'tenant_456',
      checkout_id: 'chk_123',
      status: 'confirmed',
      currency: 'USD',
      line_items: [
        {
          id: 'item_1',
          name: 'Product 1',
          quantity: 2,
          unit_price: 5000,
          total_price: 10000,
          currency: 'USD',
        },
      ],
      totals: [
        { type: 'subtotal', amount: 10000, label: 'Subtotal' },
        { type: 'total', amount: 10500, label: 'Total' },
      ],
      payment: {
        handler: 'card',
        status: 'captured',
        captured_at: new Date().toISOString(),
      },
      expectations: [],
      events: [],
      adjustments: [],
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    describe('get', () => {
      it('should get an order by ID', async () => {
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockOrder,
        });

        const result = await ucpClient.orders.get('ord_789');

        expect(result.id).toBe('ord_789');
        expect(result.status).toBe('confirmed');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/orders/ord_789'),
          expect.any(Object)
        );
      });
    });

    describe('list', () => {
      it('should list orders with filters', async () => {
        const mockResponse = {
          data: [mockOrder],
          pagination: { limit: 20, offset: 0, total: 1, total_pages: 1 },
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ucpClient.orders.list({ status: 'confirmed', limit: 20 });

        expect(result.data).toHaveLength(1);
        expect(result.pagination.total).toBe(1);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/status=confirmed.*limit=20/),
          expect.any(Object)
        );
      });
    });

    describe('updateStatus', () => {
      it('should update order status', async () => {
        const updatedOrder: PayOSOrder = { ...mockOrder, status: 'processing' };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => updatedOrder,
        });

        const result = await ucpClient.orders.updateStatus('ord_789', 'processing');

        expect(result.status).toBe('processing');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/orders/ord_789/status'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    describe('cancel', () => {
      it('should cancel an order', async () => {
        const cancelledOrder: PayOSOrder = { ...mockOrder, status: 'cancelled' };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => cancelledOrder,
        });

        const result = await ucpClient.orders.cancel('ord_789', 'Customer request');

        expect(result.status).toBe('cancelled');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/orders/ord_789/cancel'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('addExpectation', () => {
      it('should add a fulfillment expectation', async () => {
        const orderWithExpectation: PayOSOrder = {
          ...mockOrder,
          expectations: [
            {
              id: 'exp_1',
              type: 'delivery',
              description: 'Standard shipping',
              estimated_date: '2026-01-25',
            },
          ],
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => orderWithExpectation,
        });

        const result = await ucpClient.orders.addExpectation('ord_789', {
          type: 'delivery',
          description: 'Standard shipping',
          estimated_date: '2026-01-25',
        });

        expect(result.expectations).toHaveLength(1);
        expect(result.expectations[0].type).toBe('delivery');
      });
    });

    describe('addEvent', () => {
      it('should add a fulfillment event', async () => {
        const orderWithEvent: PayOSOrder = {
          ...mockOrder,
          events: [
            {
              id: 'evt_1',
              type: 'shipped',
              timestamp: new Date().toISOString(),
              description: 'Order shipped',
              tracking_number: 'TRACK123',
              carrier: 'UPS',
            },
          ],
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => orderWithEvent,
        });

        const result = await ucpClient.orders.addEvent('ord_789', {
          type: 'shipped',
          description: 'Order shipped',
          tracking_number: 'TRACK123',
          carrier: 'UPS',
        });

        expect(result.events).toHaveLength(1);
        expect(result.events[0].tracking_number).toBe('TRACK123');
      });
    });

    describe('addAdjustment', () => {
      it('should add an adjustment (refund)', async () => {
        const orderWithAdjustment: PayOSOrder = {
          ...mockOrder,
          adjustments: [
            {
              id: 'adj_1',
              type: 'refund',
              amount: 2500,
              reason: 'Item returned',
              created_at: new Date().toISOString(),
            },
          ],
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => orderWithAdjustment,
        });

        const result = await ucpClient.orders.addAdjustment('ord_789', {
          type: 'refund',
          amount: 2500,
          reason: 'Item returned',
        });

        expect(result.adjustments).toHaveLength(1);
        expect(result.adjustments[0].type).toBe('refund');
        expect(result.adjustments[0].amount).toBe(2500);
      });
    });
  });

  // ===========================================================================
  // Identity Linking Tests (Phase 4)
  // ===========================================================================

  describe('identity', () => {
    describe('registerClient', () => {
      it('should register an OAuth client', async () => {
        const mockResponse = {
          client: {
            id: 'client_123',
            client_id: 'cli_abc123',
            name: 'My AI Agent',
            redirect_uris: ['https://myagent.com/callback'],
            allowed_scopes: ['profile.read', 'checkout.create'],
            client_type: 'confidential' as const,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          client_secret: 'sec_xyz789',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ucpClient.identity.registerClient({
          name: 'My AI Agent',
          redirect_uris: ['https://myagent.com/callback'],
          allowed_scopes: ['profile.read', 'checkout.create'],
        });

        expect(result.client.name).toBe('My AI Agent');
        expect(result.client_secret).toBe('sec_xyz789');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/identity/clients'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('getAuthorizationInfo', () => {
      it('should get authorization info for consent screen', async () => {
        const mockInfo: UCPAuthorizationInfo = {
          client: {
            id: 'cli_abc123',
            name: 'My AI Agent',
            logo_url: 'https://myagent.com/logo.png',
          },
          requested_scopes: ['profile.read', 'checkout.create'],
          redirect_uri: 'https://myagent.com/callback',
          state: 'random_state_123',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockInfo,
        });

        const result = await ucpClient.identity.getAuthorizationInfo({
          response_type: 'code',
          client_id: 'cli_abc123',
          redirect_uri: 'https://myagent.com/callback',
          scope: 'profile.read checkout.create',
          state: 'random_state_123',
        });

        expect(result.client.name).toBe('My AI Agent');
        expect(result.requested_scopes).toContain('profile.read');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/v1\/ucp\/identity\/authorize.*client_id=cli_abc123/),
          expect.any(Object)
        );
      });
    });

    describe('submitConsent', () => {
      it('should submit consent and get redirect URL', async () => {
        const mockResponse = {
          redirect_uri: 'https://myagent.com/callback?code=auth_code_123&state=random_state_123',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ucpClient.identity.submitConsent({
          client_id: 'cli_abc123',
          redirect_uri: 'https://myagent.com/callback',
          scope: 'profile.read checkout.create',
          state: 'random_state_123',
          buyer_id: 'buyer_456',
          approved: true,
        });

        expect(result.redirect_uri).toContain('code=auth_code_123');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/identity/authorize/consent'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('exchangeCode', () => {
      it('should exchange authorization code for tokens', async () => {
        const mockTokens: UCPTokenResponse = {
          access_token: 'access_token_123',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'refresh_token_456',
          scope: 'profile.read checkout.create',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockTokens,
        });

        const result = await ucpClient.identity.exchangeCode({
          client_id: 'cli_abc123',
          client_secret: 'sec_xyz789',
          code: 'auth_code_123',
          redirect_uri: 'https://myagent.com/callback',
        });

        expect(result.access_token).toBe('access_token_123');
        expect(result.token_type).toBe('Bearer');
        expect(result.expires_in).toBe(3600);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/identity/token'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('refreshTokens', () => {
      it('should refresh tokens', async () => {
        const mockTokens: UCPTokenResponse = {
          access_token: 'new_access_token_789',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'new_refresh_token_012',
          scope: 'profile.read checkout.create',
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockTokens,
        });

        const result = await ucpClient.identity.refreshTokens({
          client_id: 'cli_abc123',
          client_secret: 'sec_xyz789',
          refresh_token: 'refresh_token_456',
        });

        expect(result.access_token).toBe('new_access_token_789');
        expect(result.refresh_token).toBe('new_refresh_token_012');
      });
    });

    describe('revokeToken', () => {
      it('should revoke a token', async () => {
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        const result = await ucpClient.identity.revokeToken({
          token: 'access_token_123',
          token_type_hint: 'access_token',
          client_id: 'cli_abc123',
        });

        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/identity/revoke'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('listLinkedAccounts', () => {
      it('should list linked accounts by buyer', async () => {
        const mockAccounts: UCPLinkedAccount[] = [
          {
            id: 'link_1',
            platform_id: 'platform_abc',
            platform_name: 'AI Shopping Agent',
            scopes: ['profile.read', 'checkout.create'],
            linked_at: new Date().toISOString(),
          },
        ];

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ data: mockAccounts }),
        });

        const result = await ucpClient.identity.listLinkedAccounts({
          buyer_id: 'buyer_456',
        });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].platform_name).toBe('AI Shopping Agent');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/buyer_id=buyer_456/),
          expect.any(Object)
        );
      });

      it('should list linked accounts by platform', async () => {
        const mockResponse = {
          data: [
            {
              id: 'link_1',
              buyer_id: 'buyer_456',
              buyer_email: 'buyer@example.com',
              scopes: ['profile.read'],
              linked_at: new Date().toISOString(),
            },
          ],
          pagination: { limit: 20, offset: 0, total: 1 },
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await ucpClient.identity.listLinkedAccounts({
          platform_id: 'platform_abc',
          limit: 20,
        });

        expect(result.data).toHaveLength(1);
        expect(result.pagination?.total).toBe(1);
      });
    });

    describe('unlinkAccount', () => {
      it('should unlink an account', async () => {
        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        const result = await ucpClient.identity.unlinkAccount('link_1', 'buyer_456');

        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/v1\/ucp\/identity\/linked-accounts\/link_1\?buyer_id=buyer_456/),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('getScopes', () => {
      it('should get available scopes', async () => {
        const mockScopes = {
          data: [
            { name: 'profile.read', description: 'Read your profile information' },
            { name: 'checkout.create', description: 'Create checkouts on your behalf' },
          ],
        };

        (global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => mockScopes,
        });

        const result = await ucpClient.identity.getScopes();

        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('profile.read');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/ucp/identity/scopes'),
          expect.any(Object)
        );
      });
    });
  });
});
