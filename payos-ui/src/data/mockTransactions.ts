export interface Transaction {
  id: string;
  time: string;
  type: 'Transfer' | 'Card' | 'Deposit' | 'Withdrawal';
  from: string;
  to: string;
  corridor: string;
  amount: string;
  amountNumeric: number;
  status: 'completed' | 'pending' | 'flagged' | 'failed';
  currency?: string;
  date?: string;
}

export const mockTransactions: Transaction[] = [
  { 
    id: 'txn_4a5b', 
    time: 'Dec 5 14:32', 
    type: 'Transfer', 
    from: 'TechCorp', 
    to: 'M. Garcia', 
    corridor: '🇺🇸 → 🇦🇷', 
    amount: '$4,800', 
    amountNumeric: 4800,
    status: 'completed',
    date: '2025-12-05',
    currency: 'USD'
  },
  { 
    id: 'txn_3c4d', 
    time: 'Dec 5 14:28', 
    type: 'Card', 
    from: 'C. Martinez', 
    to: 'Amazon', 
    corridor: '🇨🇴', 
    amount: '$127.50', 
    amountNumeric: 127.50,
    status: 'completed',
    date: '2025-12-05',
    currency: 'USD'
  },
  { 
    id: 'txn_2e3f', 
    time: 'Dec 5 14:15', 
    type: 'Deposit', 
    from: 'Acme Inc', 
    to: '', 
    corridor: '🇺🇸 ACH', 
    amount: '$10,000', 
    amountNumeric: 10000,
    status: 'pending',
    date: '2025-12-05',
    currency: 'USD'
  },
  { 
    id: 'txn_1a2b', 
    time: 'Dec 5 13:58', 
    type: 'Transfer', 
    from: 'StartupXYZ', 
    to: 'J. Perez', 
    corridor: '🇺🇸 → 🇲🇽', 
    amount: '$2,200', 
    amountNumeric: 2200,
    status: 'flagged',
    date: '2025-12-05',
    currency: 'USD'
  },
  { 
    id: 'txn_001', 
    time: 'Dec 5 12:00', 
    type: 'Transfer', 
    from: 'TechCorp Inc', 
    to: 'Maria Garcia', 
    corridor: '🇺🇸 → 🇦🇷', 
    amount: '$2,000', 
    amountNumeric: 2000,
    status: 'completed',
    date: '2025-12-05',
    currency: 'USD'
  },
  { 
    id: 'txn_002', 
    time: 'Dec 4 10:30', 
    type: 'Withdrawal', 
    from: 'ATM Withdrawal', 
    to: 'Maria Garcia', 
    corridor: '🇦🇷', 
    amount: '$200', 
    amountNumeric: 200,
    status: 'completed',
    date: '2025-12-04',
    currency: 'USD'
  },
  { 
    id: 'txn_003', 
    time: 'Dec 3 15:45', 
    type: 'Card', 
    from: 'Maria Garcia', 
    to: 'MercadoLibre', 
    corridor: '🇦🇷', 
    amount: '$127.80', 
    amountNumeric: 127.80,
    status: 'completed',
    date: '2025-12-03',
    currency: 'USD'
  },
  { 
    id: 'txn_004', 
    time: 'Nov 5 12:00', 
    type: 'Transfer', 
    from: 'TechCorp Inc', 
    to: 'Maria Garcia', 
    corridor: '🇺🇸 → 🇦🇷', 
    amount: '$2,000', 
    amountNumeric: 2000,
    status: 'completed',
    date: '2025-11-05',
    currency: 'USD'
  },
];

