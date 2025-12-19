/**
 * Company Profile Definitions
 * 
 * Reusable templates for different types of businesses to generate
 * realistic seed data matching various industry patterns.
 */

export interface CompanyProfile {
  name: string;
  description: string;
  industry: string;
  timeSpanMonths: number;
  
  accounts: {
    person: number;
    business: number;
    agent: number;
  };
  
  monthlyTransferGrowth: number[]; // Volume per month
  
  transactionTypes: {
    crossBorder: number;      // percentage (0-100)
    internal: number;
    payroll: number;
    vendor: number;
    refund: number;
    other: number;            // fees, adjustments, top-ups
  };
  
  paymentMethods: {
    digitalWallets: {
      percentage: number;
      distribution: {
        [stablecoin: string]: number;  // percentage within digital wallets
      };
    };
    bankAccounts: number;    // percentage
    cards: number;           // percentage
  };
  
  patterns: {
    weekdayBias: number;         // 0-1, how much more active on weekdays vs weekends
    businessHoursBias: number;   // 0-1, how much more active during business hours
    monthEndSpikes: boolean;     // payroll spikes at end of month
    seasonality: boolean;        // holiday/seasonal patterns
  };
  
  geography: {
    regions: string[];           // Primary regions for accounts
    corridors: Array<{           // Common transfer corridors
      from: string;
      to: string;
      weight: number;            // relative frequency
    }>;
  };
}

// ============================================
// Profile 1: Crypto-Native Fintech
// ============================================
export const CRYPTO_NATIVE_FINTECH: CompanyProfile = {
  name: 'Crypto-Native Fintech',
  description: 'High-growth fintech platform specializing in cross-border B2B payments using stablecoins',
  industry: 'Fintech / Crypto Payments',
  timeSpanMonths: 12,
  
  accounts: {
    person: 75,
    business: 45,
    agent: 30,
  },
  
  // Growth curve: 300 → 2,500 transfers/month
  monthlyTransferGrowth: [
    300,   // Month -11
    400,   // Month -10
    500,   // Month -9
    650,   // Month -8
    750,   // Month -7
    850,   // Month -6
    950,   // Month -5
    1200,  // Month -4
    1500,  // Month -3
    1800,  // Month -2
    2100,  // Month -1
    2500,  // Current month
  ],
  
  transactionTypes: {
    crossBorder: 45,
    internal: 20,
    payroll: 15,
    vendor: 10,
    refund: 5,
    other: 5,
  },
  
  paymentMethods: {
    digitalWallets: {
      percentage: 50,
      distribution: {
        'USDC': 32,      // Most popular
        'USDT': 24,
        'DAI': 16,
        'PYUSD': 12,
        'EURC': 8,
        'OTHER': 8,      // BUSD, USDP, FRAX, etc.
      },
    },
    bankAccounts: 30,
    cards: 20,
  },
  
  patterns: {
    weekdayBias: 0.75,          // 75% more activity on weekdays
    businessHoursBias: 0.70,    // 70% during business hours
    monthEndSpikes: true,       // Payroll on 15th and 30th
    seasonality: true,          // Holiday variations
  },
  
  geography: {
    regions: ['US', 'LATAM', 'Europe', 'Asia'],
    corridors: [
      { from: 'USD', to: 'MXN', weight: 30 },
      { from: 'USD', to: 'EUR', weight: 25 },
      { from: 'USD', to: 'BRL', weight: 15 },
      { from: 'EUR', to: 'USD', weight: 10 },
      { from: 'USD', to: 'GBP', weight: 10 },
      { from: 'USD', to: 'INR', weight: 10 },
    ],
  },
};

// ============================================
// Profile 2: Traditional SMB
// ============================================
export const TRADITIONAL_SMB: CompanyProfile = {
  name: 'Traditional Small Business',
  description: 'Small-medium business with traditional banking, focused on payroll and vendor payments',
  industry: 'General Business',
  timeSpanMonths: 12,
  
  accounts: {
    person: 40,
    business: 20,
    agent: 5,
  },
  
  monthlyTransferGrowth: [
    120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230
  ],
  
  transactionTypes: {
    crossBorder: 5,
    internal: 10,
    payroll: 40,
    vendor: 35,
    refund: 5,
    other: 5,
  },
  
  paymentMethods: {
    digitalWallets: {
      percentage: 5,
      distribution: {
        'USDC': 60,
        'USDT': 40,
      },
    },
    bankAccounts: 70,
    cards: 25,
  },
  
  patterns: {
    weekdayBias: 0.85,
    businessHoursBias: 0.80,
    monthEndSpikes: true,
    seasonality: false,
  },
  
  geography: {
    regions: ['US'],
    corridors: [
      { from: 'USD', to: 'USD', weight: 100 },
    ],
  },
};

// ============================================
// Profile 3: E-commerce Platform
// ============================================
export const ECOMMERCE_PLATFORM: CompanyProfile = {
  name: 'E-commerce Platform',
  description: 'High-volume online marketplace with thousands of small transactions',
  industry: 'E-commerce',
  timeSpanMonths: 12,
  
  accounts: {
    person: 200,
    business: 100,
    agent: 20,
  },
  
  monthlyTransferGrowth: [
    2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000
  ],
  
  transactionTypes: {
    crossBorder: 30,
    internal: 40,
    payroll: 5,
    vendor: 15,
    refund: 8,
    other: 2,
  },
  
  paymentMethods: {
    digitalWallets: {
      percentage: 30,
      distribution: {
        'USDC': 40,
        'USDT': 30,
        'PYUSD': 20,
        'DAI': 10,
      },
    },
    bankAccounts: 10,
    cards: 60,
  },
  
  patterns: {
    weekdayBias: 0.55,          // More balanced (people shop on weekends)
    businessHoursBias: 0.50,    // 24/7 activity
    monthEndSpikes: false,
    seasonality: true,          // Black Friday, holiday spikes
  },
  
  geography: {
    regions: ['Global'],
    corridors: [
      { from: 'USD', to: 'EUR', weight: 30 },
      { from: 'USD', to: 'GBP', weight: 20 },
      { from: 'USD', to: 'CAD', weight: 15 },
      { from: 'USD', to: 'AUD', weight: 15 },
      { from: 'USD', to: 'USD', weight: 20 },
    ],
  },
};

// ============================================
// Profile 4: Remittance Business
// ============================================
export const REMITTANCE_BUSINESS: CompanyProfile = {
  name: 'Remittance Business',
  description: 'Cross-border remittance provider serving immigrant communities',
  industry: 'Remittance / Money Transfer',
  timeSpanMonths: 12,
  
  accounts: {
    person: 150,
    business: 10,
    agent: 40,
  },
  
  monthlyTransferGrowth: [
    800, 850, 900, 950, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700
  ],
  
  transactionTypes: {
    crossBorder: 95,
    internal: 2,
    payroll: 0,
    vendor: 1,
    refund: 2,
    other: 0,
  },
  
  paymentMethods: {
    digitalWallets: {
      percentage: 40,
      distribution: {
        'USDC': 35,
        'USDT': 35,
        'DAI': 15,
        'PYUSD': 15,
      },
    },
    bankAccounts: 40,
    cards: 20,
  },
  
  patterns: {
    weekdayBias: 0.60,
    businessHoursBias: 0.60,
    monthEndSpikes: true,       // People send money home after payday
    seasonality: true,          // Spikes during holidays
  },
  
  geography: {
    regions: ['US', 'LATAM', 'Asia', 'Africa'],
    corridors: [
      { from: 'USD', to: 'MXN', weight: 35 },
      { from: 'USD', to: 'PHP', weight: 15 },
      { from: 'USD', to: 'INR', weight: 15 },
      { from: 'USD', to: 'VND', weight: 10 },
      { from: 'USD', to: 'NGN', weight: 10 },
      { from: 'USD', to: 'BRL', weight: 10 },
      { from: 'USD', to: 'CNY', weight: 5 },
    ],
  },
};

// ============================================
// Profile 5: Payroll SaaS
// ============================================
export const PAYROLL_SAAS: CompanyProfile = {
  name: 'Payroll SaaS Platform',
  description: 'B2B payroll service processing payments for multiple companies',
  industry: 'Payroll / HR Tech',
  timeSpanMonths: 12,
  
  accounts: {
    person: 300,    // Employees
    business: 50,   // Employer companies
    agent: 10,
  },
  
  monthlyTransferGrowth: [
    1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100
  ],
  
  transactionTypes: {
    crossBorder: 10,
    internal: 5,
    payroll: 80,
    vendor: 3,
    refund: 1,
    other: 1,
  },
  
  paymentMethods: {
    digitalWallets: {
      percentage: 15,
      distribution: {
        'USDC': 50,
        'USDT': 30,
        'PYUSD': 20,
      },
    },
    bankAccounts: 80,
    cards: 5,
  },
  
  patterns: {
    weekdayBias: 0.90,          // Payroll runs on specific days
    businessHoursBias: 0.95,    // Always during business hours
    monthEndSpikes: true,       // Bi-weekly (15th, 30th)
    seasonality: false,
  },
  
  geography: {
    regions: ['US', 'Canada', 'Europe'],
    corridors: [
      { from: 'USD', to: 'USD', weight: 70 },
      { from: 'USD', to: 'CAD', weight: 15 },
      { from: 'USD', to: 'EUR', weight: 10 },
      { from: 'USD', to: 'GBP', weight: 5 },
    ],
  },
};

// ============================================
// Profile Registry
// ============================================
export const PROFILES: Record<string, CompanyProfile> = {
  'crypto-native': CRYPTO_NATIVE_FINTECH,
  'traditional-smb': TRADITIONAL_SMB,
  'ecommerce': ECOMMERCE_PLATFORM,
  'remittance': REMITTANCE_BUSINESS,
  'payroll-saas': PAYROLL_SAAS,
};

export function getProfile(profileName: string): CompanyProfile {
  const profile = PROFILES[profileName];
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}. Available: ${Object.keys(PROFILES).join(', ')}`);
  }
  return profile;
}


