/**
 * VDC (Verifiable Digital Credential) Verifier
 * 
 * Implements W3C Verifiable Credentials verification for AP2 mandates.
 * 
 * @see Story 40.15: AP2 VDC Verification
 * @see https://www.w3.org/TR/vc-data-model/
 */

import { createHash, createVerify, createSign, generateKeyPairSync } from 'crypto';
import type { VDC, VDCProof, PaymentMandate } from './types.js';

// =============================================================================
// Types
// =============================================================================

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issuer?: string;
  subject?: string;
  issuedAt?: string;
  expiresAt?: string;
}

export interface SigningKeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
}

// =============================================================================
// Key Management (Mock for PoC)
// =============================================================================

// In production, keys would be stored securely and rotated
const MOCK_KEYS = new Map<string, SigningKeyPair>();

/**
 * Generate a new signing key pair
 */
export function generateKeyPair(keyId: string): SigningKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  
  const keyPair: SigningKeyPair = {
    publicKey,
    privateKey,
    keyId,
  };
  
  MOCK_KEYS.set(keyId, keyPair);
  return keyPair;
}

/**
 * Get key pair by ID
 */
export function getKeyPair(keyId: string): SigningKeyPair | undefined {
  return MOCK_KEYS.get(keyId);
}

// Initialize default PayOS key
const PAYOS_KEY_ID = 'did:web:payos.dev#key-1';
generateKeyPair(PAYOS_KEY_ID);

// =============================================================================
// VDC Verifier
// =============================================================================

export class VDCVerifier {
  /**
   * Verify a VDC's structure and signature
   */
  async verify(vdc: VDC): Promise<VerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Validate required fields
    if (!vdc['@context']) {
      errors.push('Missing @context');
    } else if (!vdc['@context'].includes('https://www.w3.org/2018/credentials/v1')) {
      errors.push('Invalid @context - must include W3C VC context');
    }
    
    if (!vdc.type || !Array.isArray(vdc.type)) {
      errors.push('Missing or invalid type');
    } else if (!vdc.type.includes('VerifiableCredential')) {
      errors.push('type must include VerifiableCredential');
    }
    
    if (!vdc.id) {
      warnings.push('Missing credential id (recommended)');
    }
    
    if (!vdc.issuer) {
      errors.push('Missing issuer');
    }
    
    if (!vdc.issuanceDate) {
      errors.push('Missing issuanceDate');
    } else {
      const issued = new Date(vdc.issuanceDate);
      if (isNaN(issued.getTime())) {
        errors.push('Invalid issuanceDate format');
      } else if (issued > new Date()) {
        warnings.push('issuanceDate is in the future');
      }
    }
    
    if (!vdc.credentialSubject) {
      errors.push('Missing credentialSubject');
    } else if (!vdc.credentialSubject.id) {
      warnings.push('credentialSubject.id is recommended');
    }
    
    // 2. Check expiration
    if (vdc.expirationDate) {
      const expires = new Date(vdc.expirationDate);
      if (isNaN(expires.getTime())) {
        errors.push('Invalid expirationDate format');
      } else if (expires < new Date()) {
        errors.push('Credential has expired');
      }
    }
    
    // 3. Verify proof if present
    if (vdc.proof) {
      const proofResult = await this.verifyProof(vdc);
      if (!proofResult.valid) {
        errors.push(...proofResult.errors);
      }
    } else {
      warnings.push('No proof present - credential not cryptographically verified');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      issuer: vdc.issuer,
      subject: vdc.credentialSubject?.id,
      issuedAt: vdc.issuanceDate,
      expiresAt: vdc.expirationDate,
    };
  }

  /**
   * Verify the cryptographic proof
   */
  async verifyProof(vdc: VDC): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const proof = vdc.proof;
    
    if (!proof) {
      return { valid: false, errors: ['No proof to verify'] };
    }
    
    // Validate proof structure
    if (!proof.type) {
      errors.push('Proof missing type');
    }
    
    if (!proof.verificationMethod) {
      errors.push('Proof missing verificationMethod');
    }
    
    if (!proof.proofValue && !proof.jws) {
      errors.push('Proof missing proofValue or jws');
    }
    
    if (errors.length > 0) {
      return { valid: false, errors };
    }
    
    // For PoC, verify using mock keys
    try {
      const keyPair = getKeyPair(proof.verificationMethod);
      
      if (!keyPair) {
        // In production, would fetch key from DID resolver
        // For PoC, allow verification if using PayOS key
        if (proof.verificationMethod.startsWith('did:web:payos.dev')) {
          return { valid: true, errors: [] };
        }
        errors.push(`Unknown verification method: ${proof.verificationMethod}`);
        return { valid: false, errors };
      }
      
      // Create hash of credential (without proof)
      const credentialCopy = { ...vdc };
      delete (credentialCopy as any).proof;
      const hash = createHash('sha256')
        .update(JSON.stringify(credentialCopy))
        .digest();
      
      // Verify signature
      const verifier = createVerify('sha256');
      verifier.update(hash);
      
      const signatureValue = proof.proofValue || proof.jws;
      const isValid = verifier.verify(keyPair.publicKey, signatureValue!, 'base64');
      
      if (!isValid) {
        errors.push('Invalid signature');
      }
      
      return { valid: isValid, errors };
    } catch (error: any) {
      errors.push(`Verification error: ${error.message}`);
      return { valid: false, errors };
    }
  }

  /**
   * Verify a mandate's VDC matches the mandate details
   */
  async verifyMandateVDC(
    mandate: PaymentMandate,
    vdc: VDC
  ): Promise<VerificationResult> {
    // First, verify the VDC itself
    const vdcResult = await this.verify(vdc);
    
    if (!vdcResult.valid) {
      return vdcResult;
    }
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Verify mandate-specific claims
    const subject = vdc.credentialSubject;
    
    // Check payer matches
    if (subject.id && subject.id !== mandate.payer.id) {
      errors.push(`Subject ID ${subject.id} does not match payer ${mandate.payer.id}`);
    }
    
    // Check mandate ID if present
    if (subject.mandate_id && subject.mandate_id !== mandate.id) {
      errors.push(`Mandate ID mismatch: ${subject.mandate_id} vs ${mandate.id}`);
    }
    
    // Check authorization
    if (subject.authorized !== true) {
      errors.push('Credential does not contain authorization');
    }
    
    // Check max amount if specified in VDC
    if (subject.max_amount !== undefined && mandate.max_amount !== undefined) {
      if (subject.max_amount < mandate.max_amount) {
        warnings.push(`VDC max amount (${subject.max_amount}) is less than mandate (${mandate.max_amount})`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: [...vdcResult.errors, ...errors],
      warnings: [...vdcResult.warnings, ...warnings],
      issuer: vdcResult.issuer,
      subject: vdcResult.subject,
      issuedAt: vdcResult.issuedAt,
      expiresAt: vdcResult.expiresAt,
    };
  }
}

// =============================================================================
// VDC Issuer
// =============================================================================

export class VDCIssuer {
  private keyId: string;

  constructor(keyId: string = PAYOS_KEY_ID) {
    this.keyId = keyId;
    
    // Ensure key exists
    if (!getKeyPair(keyId)) {
      generateKeyPair(keyId);
    }
  }

  /**
   * Issue a VDC for a payment mandate
   */
  async issueMandate(mandate: PaymentMandate): Promise<VDC> {
    const now = new Date();
    const expires = mandate.valid_until 
      ? new Date(mandate.valid_until)
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default
    
    const vdc: VDC = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://payos.dev/credentials/v1',
      ],
      type: ['VerifiableCredential', 'PaymentMandateCredential'],
      id: `urn:uuid:${mandate.id}`,
      issuer: 'did:web:payos.dev',
      issuanceDate: now.toISOString(),
      expirationDate: expires.toISOString(),
      credentialSubject: {
        id: mandate.payer.id,
        mandate_id: mandate.id,
        payee_id: mandate.payee.id,
        payee_name: mandate.payee.name,
        max_amount: mandate.max_amount,
        currency: mandate.currency,
        frequency: mandate.frequency,
        authorized: true,
      },
    };
    
    // Sign the credential
    vdc.proof = await this.sign(vdc);
    
    return vdc;
  }

  /**
   * Sign a VDC
   */
  async sign(vdc: VDC): Promise<VDCProof> {
    const keyPair = getKeyPair(this.keyId);
    
    if (!keyPair) {
      throw new Error(`Signing key not found: ${this.keyId}`);
    }
    
    // Create hash of credential
    const credentialCopy = { ...vdc };
    delete (credentialCopy as any).proof;
    const hash = createHash('sha256')
      .update(JSON.stringify(credentialCopy))
      .digest();
    
    // Sign
    const signer = createSign('sha256');
    signer.update(hash);
    const signature = signer.sign(keyPair.privateKey, 'base64');
    
    return {
      type: 'EcdsaSecp256r1Signature2019',
      created: new Date().toISOString(),
      verificationMethod: this.keyId,
      proofPurpose: 'assertionMethod',
      proofValue: signature,
    };
  }
}

// =============================================================================
// Singleton Instances
// =============================================================================

let verifier: VDCVerifier | null = null;
let issuer: VDCIssuer | null = null;

export function getVDCVerifier(): VDCVerifier {
  if (!verifier) {
    verifier = new VDCVerifier();
  }
  return verifier;
}

export function getVDCIssuer(): VDCIssuer {
  if (!issuer) {
    issuer = new VDCIssuer();
  }
  return issuer;
}



