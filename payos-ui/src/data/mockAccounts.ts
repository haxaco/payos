import { Account } from '../types/account';

export const mockAccounts: Account[] = [
  // === PERSONS ===
  {
    id: 'acc_person_001',
    type: 'person',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@email.com',
    phone: '+54 11 1234 5678',
    country: 'ARG',
    status: 'active',
    verificationTier: 2,
    createdAt: '2025-11-15T10:00:00Z',
    walletId: 'wal_001',
    balance: { usd: 347.50, usdc: 1500.00 },
    cardId: 'card_001',
    relationships: [
      {
        id: 'rel_001',
        relatedAccountId: 'acc_biz_001',
        relatedAccountName: 'TechCorp Inc',
        relatedAccountType: 'business',
        relationshipType: 'contractor',
        permissions: { canSend: false, canReceive: true, canView: false },
        since: '2025-11-15'
      }
    ]
  },
  {
    id: 'acc_person_002',
    type: 'person',
    firstName: 'Carlos',
    lastName: 'Martinez',
    email: 'carlos.m@email.com',
    phone: '+57 300 123 4567',
    country: 'COL',
    status: 'pending_verification',
    verificationTier: 1,
    createdAt: '2025-12-01T14:30:00Z',
    walletId: 'wal_002',
    balance: { usd: 0, usdc: 0 },
    relationships: []
  },
  {
    id: 'acc_person_003',
    type: 'person',
    firstName: 'Ana',
    lastName: 'Souza',
    email: 'ana.souza@email.com',
    phone: '+55 11 98765 4321',
    country: 'BRA',
    status: 'active',
    verificationTier: 2,
    createdAt: '2025-10-20T09:00:00Z',
    walletId: 'wal_003',
    balance: { usd: 2150.00, usdc: 500.00 },
    cardId: 'card_003',
    relationships: [
      {
        id: 'rel_002',
        relatedAccountId: 'acc_biz_001',
        relatedAccountName: 'TechCorp Inc',
        relatedAccountType: 'business',
        relationshipType: 'contractor',
        permissions: { canSend: false, canReceive: true, canView: false },
        since: '2025-10-20'
      }
    ]
  },
  {
    id: 'acc_person_004',
    type: 'person',
    firstName: 'Juan',
    lastName: 'Perez',
    email: 'juan.perez@email.com',
    phone: '+52 55 1234 5678',
    country: 'MEX',
    status: 'active',
    verificationTier: 1,
    createdAt: '2025-12-03T11:00:00Z',
    walletId: 'wal_004',
    balance: { usd: 0, usdc: 2200.00 },
    relationships: []
  },
  
  // === BUSINESSES ===
  {
    id: 'acc_biz_001',
    type: 'business',
    businessName: 'TechCorp Inc',
    legalName: 'TechCorp International Inc.',
    email: 'finance@techcorp.io',
    phone: '+1 415 555 0123',
    country: 'USA',
    registrationNumber: '84-1234567',
    industry: 'Technology Services',
    status: 'active',
    verificationTier: 2,
    createdAt: '2025-10-01T08:00:00Z',
    walletId: 'wal_biz_001',
    balance: { 
      usd: 5200.00, 
      usdc: 40000.00,
      breakdown: {
        available: 44700,
        inStreams: {
          total: 500,
          buffer: 27.32,
          streaming: 472.68
        },
        netFlow: {
          perMonth: -10000,
          direction: 'outflow' as const
        }
      }
    },
    cardId: 'card_biz_001',
    beneficialOwners: [
      { name: 'John Smith', ownershipPercent: 60, verified: true },
      { name: 'Jane Doe', ownershipPercent: 40, verified: true }
    ],
    agents: {
      count: 3,
      active: 2,
      ids: ['agent_001', 'agent_002', 'agent_003']
    },
    relationships: [
      {
        id: 'rel_003',
        relatedAccountId: 'acc_person_001',
        relatedAccountName: 'Maria Garcia',
        relatedAccountType: 'person',
        relationshipType: 'contractor',
        permissions: { canSend: true, canReceive: false, canView: true },
        since: '2025-11-15'
      },
      {
        id: 'rel_004',
        relatedAccountId: 'acc_person_003',
        relatedAccountName: 'Ana Souza',
        relatedAccountType: 'person',
        relationshipType: 'contractor',
        permissions: { canSend: true, canReceive: false, canView: true },
        since: '2025-10-20'
      }
    ]
  },
  {
    id: 'acc_biz_002',
    type: 'business',
    businessName: 'StartupXYZ',
    legalName: 'StartupXYZ LLC',
    email: 'payroll@startupxyz.com',
    phone: '+1 650 555 0456',
    country: 'USA',
    registrationNumber: '47-9876543',
    industry: 'Software Development',
    status: 'active',
    verificationTier: 2,
    createdAt: '2025-11-10T12:00:00Z',
    walletId: 'wal_biz_002',
    balance: { usd: 12500.00, usdc: 25000.00 },
    beneficialOwners: [
      { name: 'Mike Johnson', ownershipPercent: 100, verified: true }
    ],
    relationships: []
  },
  {
    id: 'acc_biz_003',
    type: 'business',
    businessName: 'Freelance Agency MX',
    legalName: 'Freelance Agency SA de CV',
    email: 'admin@freelanceagency.mx',
    phone: '+52 55 1234 5678',
    country: 'MEX',
    registrationNumber: 'FAM-210401-ABC',
    industry: 'Staffing Agency',
    status: 'active',
    verificationTier: 1,
    createdAt: '2025-11-25T16:00:00Z',
    walletId: 'wal_biz_003',
    balance: { usd: 8700.00, usdc: 3800.00 },
    beneficialOwners: [
      { name: 'Roberto Hernandez', ownershipPercent: 70, verified: true },
      { name: 'Maria Lopez', ownershipPercent: 30, verified: false }
    ],
    relationships: []
  }
];