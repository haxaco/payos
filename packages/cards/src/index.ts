/**
 * PayOS Cards Package
 * Epic 53: Card Network Integration
 * Epic 54: Card Vaulting for Agents
 *
 * This package provides integration with Visa Intelligent Commerce (VIC)
 * and Mastercard Agent Pay for AI agent payments.
 *
 * @packageDocumentation
 */

// Types
export * from './types.js';

// Web Bot Auth (RFC 9421)
export {
  WebBotAuthVerifier,
  verifyWebBotAuth,
  parseSignatureInput,
  parseSignature,
  buildSignatureBase,
  fetchPublicKey,
  createContentDigest,
  bytesToBase64,
  type VerifyOptions,
} from './web-bot-auth-verifier.js';

// Visa VIC
export { VisaVICClient, createVisaVICClient } from './visa/vic-client.js';

// Mastercard Agent Pay
export {
  MastercardAgentPayClient,
  createMastercardAgentPayClient,
} from './mastercard/agent-pay-client.js';

// Unified Client
export {
  UnifiedCardClient,
  createUnifiedCardClient,
  type UnifiedCardConfig,
  type CreatePaymentParams,
  type CapturePaymentParams,
} from './unified-card-client.js';

// Re-export specific types for convenience
export type {
  CardNetwork,
  CardBrand,
  WebBotAuthParams,
  SignatureComponents,
  VerificationResult,
  NetworkPublicKey,
  VisaVICConfig,
  VisaPaymentInstruction,
  VisaCommerceSignal,
  VisaTokenResponse,
  MastercardConfig,
  MastercardAgentRegistration,
  MastercardAgenticToken,
  MastercardPaymentRequest,
  CardPaymentIntent,
  CardPaymentResult,
  VaultedCard,
  AgentCardAccess,
  CardTransaction,
  CardNetworkCredentials,
  CardHandlerCapabilities,
} from './types.js';
