/**
 * UCP Profile Service
 *
 * Generates the UCP profile published at /.well-known/ucp
 *
 * @see Story 43.1: UCP Profile Endpoint
 * @see https://ucp.dev/specification/overview/
 */

import type {
  UCPProfile,
  UCPService,
  UCPCapability,
  UCPPaymentHandler,
  UCPCorridor,
  UCPSigningKey,
} from './types.js';

// =============================================================================
// Configuration
// =============================================================================

const UCP_VERSION = '2026-01-11';
const PAYOS_VERSION = '1.0.0';

// Base URL for API (configurable via env)
const getBaseUrl = (): string => {
  return process.env.PAYOS_API_URL || process.env.API_BASE_URL || 'https://api.payos.com';
};

const getDocsUrl = (): string => {
  return process.env.PAYOS_DOCS_URL || 'https://docs.payos.com';
};

// =============================================================================
// Capability Definitions
// =============================================================================

const PAYOS_CAPABILITIES: UCPCapability[] = [
  {
    name: 'com.payos.settlement.quote',
    version: '2026-01-11',
    description: 'Get FX quote for LATAM settlement corridor',
  },
  {
    name: 'com.payos.settlement.transfer',
    version: '2026-01-11',
    description: 'Create settlement transfer to Pix or SPEI',
  },
  {
    name: 'com.payos.settlement.status',
    version: '2026-01-11',
    description: 'Get settlement transfer status',
  },
  {
    name: 'com.payos.settlement.token',
    version: '2026-01-11',
    description: 'Acquire settlement token for checkout completion',
  },
];

// =============================================================================
// Corridor Definitions
// =============================================================================

const PAYOS_CORRIDORS: UCPCorridor[] = [
  {
    id: 'usd-brl-pix',
    name: 'USD to Brazil (Pix)',
    source_currency: 'USD',
    destination_currency: 'BRL',
    destination_country: 'BR',
    rail: 'pix',
    estimated_settlement: '< 1 minute',
  },
  {
    id: 'usdc-brl-pix',
    name: 'USDC to Brazil (Pix)',
    source_currency: 'USDC',
    destination_currency: 'BRL',
    destination_country: 'BR',
    rail: 'pix',
    estimated_settlement: '< 1 minute',
  },
  {
    id: 'usd-mxn-spei',
    name: 'USD to Mexico (SPEI)',
    source_currency: 'USD',
    destination_currency: 'MXN',
    destination_country: 'MX',
    rail: 'spei',
    estimated_settlement: '< 30 minutes',
  },
  {
    id: 'usdc-mxn-spei',
    name: 'USDC to Mexico (SPEI)',
    source_currency: 'USDC',
    destination_currency: 'MXN',
    destination_country: 'MX',
    rail: 'spei',
    estimated_settlement: '< 30 minutes',
  },
];

// =============================================================================
// Payment Handler Definition
// =============================================================================

const getPaymentHandler = (): UCPPaymentHandler => {
  const baseUrl = getBaseUrl();
  const docsUrl = getDocsUrl();

  return {
    id: 'payos_latam',
    name: 'com.payos.latam_settlement',
    version: UCP_VERSION,
    spec: `${docsUrl}/ucp/handlers/latam`,
    config_schema: `${baseUrl}/ucp/schemas/handler_config.json`,
    instrument_schemas: [
      `${baseUrl}/ucp/schemas/pix_instrument.json`,
      `${baseUrl}/ucp/schemas/spei_instrument.json`,
    ],
    supported_currencies: ['USD', 'USDC', 'BRL', 'MXN'],
    supported_corridors: PAYOS_CORRIDORS,
  };
};

// =============================================================================
// Service Definitions
// =============================================================================

const getServices = (): Record<string, UCPService> => {
  const baseUrl = getBaseUrl();
  const docsUrl = getDocsUrl();

  return {
    'com.payos.settlement': {
      version: UCP_VERSION,
      spec: `${docsUrl}/ucp/settlement`,
      rest: {
        schema: `${baseUrl}/ucp/openapi.json`,
        endpoint: `${baseUrl}/v1/ucp`,
      },
    },
  };
};

// =============================================================================
// Signing Keys (for webhook verification)
// =============================================================================

const getSigningKeys = (): UCPSigningKey[] => {
  // In production, these would be real JWK keys
  // For now, return a placeholder that will be replaced with real keys
  const keyId = process.env.PAYOS_SIGNING_KEY_ID || 'payos-ucp-key-1';

  return [
    {
      kid: keyId,
      kty: 'EC',
      alg: 'ES256',
      use: 'sig',
      crv: 'P-256',
      // These would be populated from environment/secrets in production
      x: process.env.PAYOS_SIGNING_KEY_X || '',
      y: process.env.PAYOS_SIGNING_KEY_Y || '',
    },
  ];
};

// =============================================================================
// Profile Generation
// =============================================================================

/**
 * Generate the complete UCP profile for PayOS
 */
export function generateUCPProfile(): UCPProfile {
  const signingKeys = getSigningKeys();
  // Filter out keys without actual values (development mode)
  const validKeys = signingKeys.filter((k) => k.x && k.y);

  const profile: UCPProfile = {
    ucp: {
      version: UCP_VERSION,
      services: getServices(),
      capabilities: PAYOS_CAPABILITIES,
    },
    payment: {
      handlers: [getPaymentHandler()],
    },
  };

  // Only include signing keys if they're configured
  if (validKeys.length > 0) {
    profile.signing_keys = validKeys;
  }

  return profile;
}

/**
 * Get PayOS capabilities list
 */
export function getCapabilities(): UCPCapability[] {
  return PAYOS_CAPABILITIES;
}

/**
 * Get supported corridors
 */
export function getCorridors(): UCPCorridor[] {
  return PAYOS_CORRIDORS;
}

/**
 * Get payment handler info
 */
export function getPaymentHandlerInfo(): UCPPaymentHandler {
  return getPaymentHandler();
}

/**
 * Check if a corridor is supported
 */
export function isCorridorSupported(
  sourceCurrency: string,
  destinationCurrency: string,
  rail: string
): boolean {
  return PAYOS_CORRIDORS.some(
    (c) =>
      c.source_currency === sourceCurrency &&
      c.destination_currency === destinationCurrency &&
      c.rail === rail
  );
}

/**
 * Get corridor by ID
 */
export function getCorridorById(corridorId: string): UCPCorridor | undefined {
  return PAYOS_CORRIDORS.find((c) => c.id === corridorId);
}

/**
 * Get UCP version
 */
export function getUCPVersion(): string {
  return UCP_VERSION;
}

/**
 * Get PayOS version
 */
export function getPayOSVersion(): string {
  return PAYOS_VERSION;
}
