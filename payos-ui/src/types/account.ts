export type AccountType = 'person' | 'business';
export type VerificationTier = 0 | 1 | 2 | 3;
export type AccountStatus = 'pending_verification' | 'active' | 'suspended' | 'closed';

export interface BeneficialOwner {
  name: string;
  ownershipPercent: number;
  verified: boolean;
}

export interface Relationship {
  id: string;
  relatedAccountId: string;
  relatedAccountName: string;
  relatedAccountType: AccountType;
  relationshipType: 'employee' | 'contractor' | 'vendor' | 'owner' | 'family';
  permissions: {
    canSend: boolean;
    canReceive: boolean;
    canView: boolean;
  };
  since: string;
}

export interface Account {
  id: string;
  type: AccountType;
  
  // Common fields
  email: string;
  phone?: string;
  country: string;
  status: AccountStatus;
  verificationTier: VerificationTier;
  createdAt: string;
  
  // Person-specific
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  
  // Business-specific
  businessName?: string;
  legalName?: string;
  registrationNumber?: string;
  industry?: string;
  beneficialOwners?: BeneficialOwner[];
  
  // Financial
  walletId: string;
  balance: {
    usd: number;
    usdc: number;
  };
  
  // Agents
  agents?: {
    count: number;
    active: number;
    ids: string[];
  };
  
  // Optional
  cardId?: string;
  relationships?: Relationship[];
}