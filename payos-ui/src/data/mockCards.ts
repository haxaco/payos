export interface CardData {
  id: string;
  accountId: string;
  accountName: string;
  accountType: 'person' | 'business';
  panMasked: string;
  panFull: string;
  expiry: string;
  cvv: string;
  type: 'virtual' | 'physical';
  status: 'active' | 'frozen' | 'cancelled';
  limits: {
    daily: number;
    monthly: number;
    perTransaction: number;
  };
  spent: {
    daily: number;
    monthly: number;
  };
  createdAt: string;
  transactions: Array<{
    id: string;
    date: string;
    merchant: string;
    category: string;
    amount: number;
    status: 'completed' | 'pending' | 'declined';
  }>;
}

export const mockCards: CardData[] = [
  {
    id: 'card_001',
    accountId: 'acc_person_001',
    accountName: 'Maria Garcia',
    accountType: 'person',
    panMasked: '•••• •••• •••• 4521',
    panFull: '4532 1234 5678 4521',
    expiry: '12/27',
    cvv: '847',
    type: 'virtual',
    status: 'active',
    limits: {
      daily: 500,
      monthly: 5000,
      perTransaction: 200
    },
    spent: {
      daily: 127.50,
      monthly: 847.20
    },
    createdAt: '2025-11-15T10:00:00Z',
    transactions: [
      { id: 'txn_c01', date: '2025-12-05', merchant: 'Supermercado Dia', category: 'Groceries', amount: 45.20, status: 'completed' },
      { id: 'txn_c02', date: '2025-12-04', merchant: 'MercadoLibre', category: 'Retail', amount: 127.80, status: 'completed' },
      { id: 'txn_c03', date: '2025-12-03', merchant: 'Uber', category: 'Transport', amount: 12.50, status: 'completed' },
      { id: 'txn_c04', date: '2025-12-02', merchant: 'Shell Gas Station', category: 'Gas', amount: 35.00, status: 'declined' },
      { id: 'txn_c05', date: '2025-12-01', merchant: 'Netflix', category: 'Entertainment', amount: 15.99, status: 'completed' }
    ]
  },
  {
    id: 'card_002',
    accountId: 'acc_business_001',
    accountName: 'TechCorp Inc',
    accountType: 'business',
    panMasked: '•••• •••• •••• 8834',
    panFull: '5467 8901 2345 8834',
    expiry: '08/28',
    cvv: '123',
    type: 'virtual',
    status: 'active',
    limits: {
      daily: 5000,
      monthly: 50000,
      perTransaction: 2000
    },
    spent: {
      daily: 1234.50,
      monthly: 12400.00
    },
    createdAt: '2025-10-01T10:00:00Z',
    transactions: [
      { id: 'txn_c06', date: '2025-12-05', merchant: 'AWS', category: 'Cloud Services', amount: 450.00, status: 'completed' },
      { id: 'txn_c07', date: '2025-12-04', merchant: 'Office Depot', category: 'Supplies', amount: 234.50, status: 'completed' },
      { id: 'txn_c08', date: '2025-12-03', merchant: 'Adobe', category: 'Software', amount: 89.99, status: 'completed' },
      { id: 'txn_c09', date: '2025-12-02', merchant: 'LinkedIn', category: 'Marketing', amount: 299.00, status: 'completed' },
      { id: 'txn_c10', date: '2025-12-01', merchant: 'Zoom', category: 'Software', amount: 160.00, status: 'completed' }
    ]
  },
  {
    id: 'card_003',
    accountId: 'acc_person_002',
    accountName: 'Carlos Martinez',
    accountType: 'person',
    panMasked: '•••• •••• •••• 2847',
    panFull: '4916 7890 1234 2847',
    expiry: '03/26',
    cvv: '456',
    type: 'physical',
    status: 'frozen',
    limits: {
      daily: 300,
      monthly: 3000,
      perTransaction: 150
    },
    spent: {
      daily: 0,
      monthly: 0
    },
    createdAt: '2025-09-10T10:00:00Z',
    transactions: []
  },
  {
    id: 'card_004',
    accountId: 'acc_person_003',
    accountName: 'Ana Silva',
    accountType: 'person',
    panMasked: '•••• •••• •••• 9182',
    panFull: '4539 4321 8765 9182',
    expiry: '06/27',
    cvv: '789',
    type: 'virtual',
    status: 'active',
    limits: {
      daily: 400,
      monthly: 4000,
      perTransaction: 175
    },
    spent: {
      daily: 45.00,
      monthly: 1200.00
    },
    createdAt: '2025-11-20T10:00:00Z',
    transactions: [
      { id: 'txn_c11', date: '2025-12-05', merchant: 'Starbucks', category: 'Food', amount: 12.50, status: 'completed' },
      { id: 'txn_c12', date: '2025-12-04', merchant: 'Amazon', category: 'Retail', amount: 67.99, status: 'completed' },
      { id: 'txn_c13', date: '2025-12-02', merchant: 'Spotify', category: 'Entertainment', amount: 9.99, status: 'completed' }
    ]
  }
];

