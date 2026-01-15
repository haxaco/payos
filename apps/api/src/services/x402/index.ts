/**
 * x402 Services Index
 * Story 40.8: x402 Facilitator Integration
 * 
 * Exports x402 facilitator client and utilities.
 */

export {
  X402FacilitatorClient,
  X402FacilitatorError,
  getX402FacilitatorClient,
  createX402FacilitatorClient,
  resetX402FacilitatorClient,
  getCurrentNetwork,
  createPaymentPayload,
  toUsdcUnits,
  fromUsdcUnits,
} from './facilitator.js';

export type {
  X402PaymentPayload,
  VerifyResponse,
  SettleResponse,
  SupportedScheme,
  SupportedResponse,
  FacilitatorConfig,
} from './facilitator.js';



