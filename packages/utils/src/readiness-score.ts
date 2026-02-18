// ============================================
// READINESS SCORE ALGORITHM (Epic 56)
// ============================================

import type { ScanStructuredData, ScanAccessibility, ReadinessGrade, DetectionStatus } from '@sly/types';
import { READINESS_GRADES } from '@sly/types';

export interface ProtocolInput {
  protocol: string;
  status: DetectionStatus;
  is_functional?: boolean;
}

export interface ReadinessScoreInput {
  protocol: ProtocolInput[];
  structured: Pick<ScanStructuredData,
    'has_schema_product' | 'has_schema_offer' | 'has_schema_organization' |
    'has_json_ld' | 'has_open_graph' | 'has_microdata' |
    'product_count' | 'products_with_price' | 'products_with_availability' |
    'products_with_sku' | 'products_with_image'
  >;
  accessibility: Pick<ScanAccessibility,
    'robots_txt_exists' | 'robots_blocks_gptbot' | 'robots_blocks_claudebot' |
    'robots_blocks_all_bots' | 'robots_allows_agents' |
    'has_captcha' | 'requires_javascript' |
    'guest_checkout_available' | 'requires_account' | 'checkout_steps_count' |
    'payment_processors' | 'supports_digital_wallets' | 'supports_crypto' |
    'supports_pix' | 'supports_spei'
  >;
}

export interface ReadinessScoreResult {
  readiness_score: number;
  protocol_score: number;
  data_score: number;
  accessibility_score: number;
  checkout_score: number;
}

/** Status hierarchy multiplier: confirmed=1.0, platform_enabled=0.5, eligible=0.3 */
function statusMultiplier(status: DetectionStatus): number {
  switch (status) {
    case 'confirmed': return 1.0;
    case 'platform_enabled': return 0.5;
    case 'eligible': return 0.3;
    default: return 0;
  }
}

function getProtocolPoints(
  protocols: ProtocolInput[],
  name: string,
  functionalPoints: number,
  detectedPoints: number,
): number {
  const match = protocols.find(p => p.protocol === name);
  if (!match) return 0;
  const mult = statusMultiplier(match.status);
  if (mult === 0) return 0;
  const base = match.is_functional ? functionalPoints : detectedPoints;
  return Math.round(base * mult);
}

export function computeReadinessScore(input: ReadinessScoreInput): ReadinessScoreResult {
  // --- PROTOCOL SCORE (40% weight) ---
  let protocolScore = 0;

  protocolScore += getProtocolPoints(input.protocol, 'ucp', 30, 20);
  protocolScore += getProtocolPoints(input.protocol, 'acp', 20, 12);
  protocolScore += getProtocolPoints(input.protocol, 'mcp', 15, 8);
  protocolScore += getProtocolPoints(input.protocol, 'x402', 10, 0);
  protocolScore += getProtocolPoints(input.protocol, 'ap2', 10, 0);
  protocolScore += getProtocolPoints(input.protocol, 'visa_vic', 5, 5);
  protocolScore += getProtocolPoints(input.protocol, 'mastercard_agentpay', 5, 5);
  protocolScore += getProtocolPoints(input.protocol, 'nlweb', 5, 5);

  protocolScore = Math.min(100, protocolScore);

  // --- DATA SCORE (25% weight) ---
  let dataScore = 0;
  const sd = input.structured;

  if (sd.has_json_ld) dataScore += 25;
  else if (sd.has_microdata) dataScore += 15;

  if (sd.has_schema_product) dataScore += 20;
  if (sd.has_schema_offer) dataScore += 15;
  if (sd.has_open_graph) dataScore += 10;

  if (sd.product_count > 0) {
    const priceRate = sd.products_with_price / sd.product_count;
    const availRate = sd.products_with_availability / sd.product_count;
    const skuRate = sd.products_with_sku / sd.product_count;
    const imgRate = sd.products_with_image / sd.product_count;

    dataScore += Math.round(priceRate * 10);
    dataScore += Math.round(availRate * 8);
    dataScore += Math.round(skuRate * 6);
    dataScore += Math.round(imgRate * 6);
  }

  dataScore = Math.min(100, dataScore);

  // --- ACCESSIBILITY SCORE (20% weight) ---
  let accessScore = 100;
  const acc = input.accessibility;

  if (acc.robots_blocks_all_bots) accessScore -= 40;
  else {
    if (acc.robots_blocks_gptbot) accessScore -= 10;
    if (acc.robots_blocks_claudebot) accessScore -= 10;
  }
  if (acc.has_captcha) accessScore -= 25;
  if (acc.requires_javascript) accessScore -= 15;
  if (!acc.robots_txt_exists) accessScore -= 5;
  if (acc.robots_allows_agents) accessScore += 10;

  accessScore = Math.max(0, Math.min(100, accessScore));

  // --- CHECKOUT SCORE (15% weight) ---
  let checkoutScore = 0;

  if (acc.guest_checkout_available) checkoutScore += 30;
  if (!acc.requires_account) checkoutScore += 20;

  if (acc.checkout_steps_count !== undefined) {
    if (acc.checkout_steps_count <= 1) checkoutScore += 25;
    else if (acc.checkout_steps_count <= 3) checkoutScore += 15;
    else if (acc.checkout_steps_count <= 5) checkoutScore += 5;
  }

  if (acc.payment_processors.length >= 3) checkoutScore += 10;
  else if (acc.payment_processors.length >= 1) checkoutScore += 5;

  if (acc.supports_digital_wallets) checkoutScore += 5;
  if (acc.supports_crypto) checkoutScore += 5;
  if (acc.supports_pix) checkoutScore += 3;
  if (acc.supports_spei) checkoutScore += 2;

  checkoutScore = Math.min(100, checkoutScore);

  // --- COMPOSITE ---
  const readinessScore = Math.round(
    protocolScore * 0.40 +
    dataScore * 0.25 +
    accessScore * 0.20 +
    checkoutScore * 0.15
  );

  return {
    readiness_score: readinessScore,
    protocol_score: protocolScore,
    data_score: dataScore,
    accessibility_score: accessScore,
    checkout_score: checkoutScore,
  };
}

export function getReadinessGrade(score: number): ReadinessGrade {
  if (score >= READINESS_GRADES.A.min) return 'A';
  if (score >= READINESS_GRADES.B.min) return 'B';
  if (score >= READINESS_GRADES.C.min) return 'C';
  if (score >= READINESS_GRADES.D.min) return 'D';
  return 'F';
}
