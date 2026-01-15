/**
 * AP2 (Agent-to-Agent Protocol) Types
 * 
 * Google's protocol for agentic payments with VDCs.
 * 
 * @see Story 40.14: AP2 Reference Setup
 * @see https://github.com/ACP-WG/a2a-protocols
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Verifiable Digital Credential (VDC)
 * Used for mandate authorization
 */
export interface VDC {
  '@context': string[];
  type: string[];
  id: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: any;
  };
  proof?: VDCProof;
}

export interface VDCProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  jws?: string;
  proofValue?: string;
}

/**
 * Payment Mandate - authorization for recurring/automated payments
 */
export interface PaymentMandate {
  id: string;
  version: string;
  type: 'single' | 'recurring' | 'standing';
  
  // Parties
  payer: {
    id: string;
    name?: string;
    agent_id?: string;
  };
  payee: {
    id: string;
    name: string;
    account?: string;
  };
  
  // Authorization
  max_amount?: number;
  currency: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  max_occurrences?: number;
  
  // Validity
  valid_from: string;
  valid_until?: string;
  
  // VDC
  credential?: VDC;
  
  // Status
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
}

/**
 * AP2 Payment Request
 */
export interface AP2PaymentRequest {
  id: string;
  mandate_id: string;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  metadata?: Record<string, any>;
  
  // For x402 integration
  destination?: {
    type: 'x402' | 'pix' | 'spei' | 'wire';
    address?: string;  // For x402
    pix_key?: string;  // For Pix
    clabe?: string;    // For SPEI
  };
}

/**
 * AP2 Payment Response
 */
export interface AP2PaymentResponse {
  id: string;
  request_id: string;
  status: 'pending' | 'authorized' | 'processing' | 'completed' | 'failed' | 'rejected';
  amount: number;
  currency: string;
  
  // Authorization
  authorized_at?: string;
  authorized_by?: string;
  
  // Processing
  transfer_id?: string;
  settlement_id?: string;
  
  // Error
  error_code?: string;
  error_message?: string;
  
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Agent Card
// =============================================================================

/**
 * Agent Card - discovery and capability advertisement
 */
export interface AgentCard {
  id: string;
  name: string;
  description?: string;
  version: string;
  
  // Capabilities
  capabilities: {
    payments: {
      currencies: string[];
      rails: string[];
      max_amount?: number;
      supports_mandates: boolean;
      supports_x402: boolean;
    };
    protocols: string[];  // ['ap2', 'acp', 'x402']
  };
  
  // Endpoints
  endpoints: {
    mandates?: string;
    payments?: string;
    webhooks?: string;
    discovery?: string;
  };
  
  // Verification
  verification: {
    did?: string;
    public_key?: string;
    certificate_url?: string;
  };
  
  // Metadata
  logo_url?: string;
  website?: string;
  support_email?: string;
  
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Events
// =============================================================================

export type AP2EventType = 
  | 'mandate.created'
  | 'mandate.activated'
  | 'mandate.suspended'
  | 'mandate.revoked'
  | 'mandate.expired'
  | 'payment.requested'
  | 'payment.authorized'
  | 'payment.processing'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.rejected';

export interface AP2Event {
  id: string;
  type: AP2EventType;
  timestamp: string;
  data: {
    mandate_id?: string;
    payment_id?: string;
    [key: string]: any;
  };
  signature?: string;
}



