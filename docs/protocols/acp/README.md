# ACP Protocol Documentation

The Agent Commerce Protocol (ACP) provides a high-level commerce layer for AI agents, supporting shopping carts, order management, and merchant integrations.

## Overview

ACP enables AI agents to participate in e-commerce activities autonomously. It provides familiar commerce primitives (carts, orders, products) adapted for agent-driven transactions with enhanced tracking, validation, and compliance features.

**Status:** Foundation complete, UI integration complete

## Key Features

- Agent shopping cart management
- Order lifecycle management
- Merchant integration framework
- Product catalog support
- Commerce analytics
- Agent purchasing behavior tracking
- Inventory management integration
- Fulfillment tracking

## Documentation Index

### Implementation Documentation

| Document | Description | Status |
|----------|-------------|--------|
| [ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md](ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md) | Foundation implementation complete | Complete |

### UI Integration

| Document | Description | Status |
|----------|-------------|--------|
| [ACP_UI_INTEGRATION_STATUS.md](ACP_UI_INTEGRATION_STATUS.md) | UI integration status | Complete |

## Quick Start

### For Agents (Shopping)

```typescript
import { ACPClient } from '@sly/api-client';

const client = new ACPClient({
  apiKey: 'pk_test_your_key',
  agentId: 'agent_123'
});

// Create shopping cart
const cart = await client.createCart({
  agentId: 'agent_123',
  merchantId: 'merchant_456'
});

// Add items to cart
await client.addCartItem(cart.id, {
  productId: 'prod_789',
  quantity: 2,
  price: 25.00
});

// Checkout cart to create order
const order = await client.checkout(cart.id, {
  shippingAddress: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102'
  },
  paymentMethod: 'wallet_agent_123'
});
```

### For Merchants (Managing Products)

```typescript
import { ACPMerchant } from '@sly/api-client';

const merchant = new ACPMerchant({
  apiKey: 'pk_test_your_key',
  merchantId: 'merchant_123'
});

// Register product
const product = await merchant.createProduct({
  name: 'API Access Token',
  description: 'Monthly API access subscription',
  price: 99.00,
  currency: 'USD',
  inventory: 1000,
  metadata: {
    sku: 'API-MONTHLY',
    category: 'subscription',
    renewable: true
  }
});

// Process order
const order = await merchant.getOrder('order_456');
await merchant.fulfillOrder(order.id, {
  trackingNumber: 'TRACK123',
  carrier: 'digital_delivery',
  estimatedDelivery: '2025-12-30'
});
```

## Protocol Flow

```
1. Agent → PayOS: POST /v1/acp/carts
   Response: { id: 'cart_123', items: [], total: 0 }

2. Agent → PayOS: POST /v1/acp/carts/:id/items
   Body: { productId, quantity, price }
   Response: { cart with updated items and total }

3. Agent → PayOS: POST /v1/acp/orders
   Body: { cartId, shipping, payment }
   Response: { id: 'order_456', status: 'pending' }

4. PayOS (background):
   - Validate inventory
   - Process payment (via AP2)
   - Create fulfillment task
   - Update order status

5. Merchant → PayOS: POST /v1/acp/orders/:id/fulfill
   Body: { trackingNumber, carrier }
   Response: { status: 'fulfilled' }

6. Agent → PayOS: GET /v1/acp/orders/:id
   Response: { status: 'fulfilled', tracking: {...} }
```

## API Endpoints

### Cart Endpoints

```
POST   /v1/acp/carts              # Create cart
GET    /v1/acp/carts/:id          # Get cart
PUT    /v1/acp/carts/:id          # Update cart
DELETE /v1/acp/carts/:id          # Delete cart
POST   /v1/acp/carts/:id/items    # Add item
DELETE /v1/acp/carts/:id/items/:itemId  # Remove item
```

### Order Endpoints

```
POST   /v1/acp/orders             # Create order (checkout)
GET    /v1/acp/orders/:id         # Get order
GET    /v1/acp/orders             # List orders
PATCH  /v1/acp/orders/:id         # Update order
POST   /v1/acp/orders/:id/cancel  # Cancel order
POST   /v1/acp/orders/:id/fulfill # Fulfill order
```

### Merchant Endpoints

```
GET    /v1/acp/merchants          # List merchants
GET    /v1/acp/merchants/:id      # Get merchant details
POST   /v1/acp/merchants          # Register merchant
PUT    /v1/acp/merchants/:id      # Update merchant
```

### Product Endpoints

```
GET    /v1/acp/products           # List products
GET    /v1/acp/products/:id       # Get product
POST   /v1/acp/products           # Create product
PUT    /v1/acp/products/:id       # Update product
DELETE /v1/acp/products/:id       # Delete product
```

## Database Schema

### Core Tables

- `acp_carts` - Shopping carts
- `acp_cart_items` - Cart line items
- `acp_orders` - Orders
- `acp_order_items` - Order line items
- `acp_merchants` - Merchant accounts
- `acp_products` - Product catalog
- `acp_fulfillments` - Fulfillment tracking

See [../../architecture/wallet-schema.md](../../architecture/wallet-schema.md) for details.

## Features

### Shopping Cart Management

Full-featured cart with:
- Add/remove items
- Quantity updates
- Price calculations
- Tax and shipping estimates
- Cart abandonment tracking
- Multi-merchant support

### Order Lifecycle

Complete order management:
1. **Pending**: Order created, awaiting payment
2. **Paid**: Payment processed
3. **Processing**: Being prepared for shipment
4. **Fulfilled**: Shipped/delivered
5. **Cancelled**: Order cancelled
6. **Refunded**: Payment refunded

### Merchant Integration

Merchants can:
- Register and manage profiles
- Create product catalogs
- Process orders
- Track fulfillment
- View analytics
- Manage inventory

### Agent Analytics

Track agent purchasing behavior:
- Purchase frequency
- Average order value
- Category preferences
- Merchant preferences
- Cart abandonment rates
- Seasonal patterns

## Implementation Status

### Completed Features

- [x] Core ACP cart API
- [x] Order management system
- [x] Merchant registration
- [x] Product catalog
- [x] Fulfillment tracking
- [x] Database schema and migrations
- [x] RLS policies
- [x] API endpoints
- [x] UI integration
- [x] Dashboard pages
- [x] Component library

See [ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md](ACP_FOUNDATION_IMPLEMENTATION_COMPLETE.md) for details.

### UI Integration

- [x] Shopping cart UI
- [x] Order history dashboard
- [x] Merchant management
- [x] Product catalog browser
- [x] Fulfillment tracking
- [x] Commerce analytics

See [ACP_UI_INTEGRATION_STATUS.md](ACP_UI_INTEGRATION_STATUS.md) for UI details.

## Testing

### Unit Tests

```bash
# Run ACP unit tests
pnpm --filter @sly/api test tests/unit/acp
```

### Integration Tests

```bash
# Run ACP integration tests
INTEGRATION=true pnpm --filter @sly/api test tests/integration/acp
```

### Manual Testing

1. Navigate to `/dashboard/agentic-payments` in UI
2. Create test cart and add products
3. Checkout to create order
4. Test fulfillment workflow
5. Review analytics

## Performance

ACP is optimized for:

- Fast cart operations
- Efficient order processing
- Scalable product catalog
- Real-time inventory checks

Current metrics:
- Cart creation: ~50ms avg
- Order creation: ~150ms avg
- Product lookup: ~20ms avg
- Catalog query: ~100ms avg

## Security

ACP implements commerce-specific security:

- **Agent authorization**: Validate agent can make purchases
- **Merchant verification**: KYB verification for merchants
- **Payment validation**: Integrate with AP2 for secure payments
- **Order fraud detection**: Monitor suspicious patterns
- **RLS policies**: Multi-tenant isolation

See [../../security/RLS_STRATEGY.md](../../security/RLS_STRATEGY.md) for security details.

## Common Use Cases

### API Service Subscription

Agent subscribes to monthly API access:

```typescript
const cart = await client.createCart({ agentId: 'agent_123' });
await client.addCartItem(cart.id, {
  productId: 'prod_api_monthly',
  quantity: 1,
  price: 99.00
});
const order = await client.checkout(cart.id);
```

### Bulk Resource Purchase

Agent purchases compute credits:

```typescript
const cart = await client.createCart({ agentId: 'agent_123' });
await client.addCartItem(cart.id, {
  productId: 'prod_compute_credits',
  quantity: 1000,
  price: 0.10  // $0.10 per credit
});
const order = await client.checkout(cart.id);
```

### Multi-Merchant Order

Agent orders from multiple merchants:

```typescript
// Cart 1: Merchant A
const cart1 = await client.createCart({
  agentId: 'agent_123',
  merchantId: 'merchant_a'
});
await client.addCartItem(cart1.id, { productId: 'prod_1', ... });

// Cart 2: Merchant B
const cart2 = await client.createCart({
  agentId: 'agent_123',
  merchantId: 'merchant_b'
});
await client.addCartItem(cart2.id, { productId: 'prod_2', ... });

// Checkout separately
const order1 = await client.checkout(cart1.id);
const order2 = await client.checkout(cart2.id);
```

## Integration with Other Protocols

### AP2 Integration

ACP uses AP2 for payment processing:
- Multi-party settlements for marketplace fees
- Agent authorization for purchases
- Payment metadata tracking

### x402 Integration

ACP can integrate with x402 for:
- Usage-based pricing (pay-per-API-call)
- Metered billing
- Micropayment aggregation

## Related Documentation

- [Protocol Overview](../README.md) - All protocol documentation
- [x402 Protocol](../x402/README.md) - HTTP payment protocol
- [AP2 Protocol](../ap2/README.md) - Advanced agent payments
- [Architecture](../../architecture/) - System architecture
- [Security](../../security/) - Security and RLS
- [PRD](../../prd/PayOS_PRD_Development.md) - Epic 19 (ACP Foundation)

## Roadmap

Planned improvements:

- [ ] Subscription management
- [ ] Recurring orders
- [ ] Product recommendations
- [ ] Cart sharing between agents
- [ ] Wishlist functionality
- [ ] Product reviews and ratings
- [ ] Inventory alerts
- [ ] Advanced analytics

---

**Protocol Version:** 1.0
**Status:** Foundation Complete
**Last Updated:** December 29, 2025
**Maintained By:** PayOS Team

For questions or issues, see the main [PayOS Documentation](../../README.md).
