'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'en-US' | 'en-EU' | 'es-LATAM';

export interface LocaleConfig {
  locale: Locale;
  intlLocale: string; // Actual Intl locale string
  defaultFiatCurrency: string;
  dateFormat: Intl.DateTimeFormatOptions;
  numberFormat: {
    minimumFractionDigits: number;
    maximumFractionDigits: number;
  };
}

// Non-ISO currency symbols (stablecoins, crypto, supertokens)
const CRYPTO_SYMBOLS: Record<string, string> = {
  // Stablecoins
  'USDC': '$',
  'USDT': '$',
  'DAI': '$',
  'BUSD': '$',
  // Supertokens (Superfluid wrapped tokens)
  'USDCx': '$',
  'fUSDCx': '$',
  'fDAIx': '$',
  // Crypto
  'ETH': 'Ξ',
  'MATIC': 'MATIC ',
  'BTC': '₿',
};

// ISO 4217 fiat currency codes
const FIAT_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD',
  'MXN', 'BRL', 'ARS', 'COP', 'PEN', 'CLP',
  'INR', 'KRW', 'SGD', 'HKD', 'TWD', 'THB',
]);

const localeConfigs: Record<Locale, LocaleConfig> = {
  'en-US': {
    locale: 'en-US',
    intlLocale: 'en-US',
    defaultFiatCurrency: 'USD',
    dateFormat: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    numberFormat: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  'en-EU': {
    locale: 'en-EU',
    intlLocale: 'en-GB',
    defaultFiatCurrency: 'EUR',
    dateFormat: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
    numberFormat: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
  'es-LATAM': {
    locale: 'es-LATAM',
    intlLocale: 'es-MX',
    defaultFiatCurrency: 'USD',
    dateFormat: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
    numberFormat: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  },
};

interface LocaleContextType {
  locale: Locale;
  config: LocaleConfig;
  setLocale: (locale: Locale) => void;
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en-US');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('payos-locale') as Locale;
    if (saved && localeConfigs[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('payos-locale', newLocale);
  };

  const config = localeConfigs[locale];

  /**
   * Format currency - handles both fiat (ISO 4217) and crypto/stablecoins
   */
  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || config.defaultFiatCurrency;
    const isCrypto = curr in CRYPTO_SYMBOLS;
    const isFiat = FIAT_CURRENCIES.has(curr);

    if (isFiat) {
      // Use Intl.NumberFormat for fiat currencies
      return new Intl.NumberFormat(config.intlLocale, {
        style: 'currency',
        currency: curr,
        ...config.numberFormat,
      }).format(amount);
    }

    if (isCrypto) {
      // Format crypto with custom symbol
      const symbol = CRYPTO_SYMBOLS[curr];
      const maxDecimals = curr.endsWith('x') ? 6 : 2; // Supertokens get more precision
      
      const formatted = new Intl.NumberFormat(config.intlLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: maxDecimals,
      }).format(amount);

      // For dollar-based stablecoins, format like: $1,234.56 USDC
      if (symbol === '$') {
        return `${symbol}${formatted} ${curr}`;
      }

      // For other crypto, just symbol + amount
      return `${symbol}${formatted}`;
    }

    // Unknown currency - format as number with currency code
    const formatted = new Intl.NumberFormat(config.intlLocale, {
      ...config.numberFormat,
    }).format(amount);
    
    return `${formatted} ${curr}`;
  };

  const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(config.intlLocale, {
      ...config.dateFormat,
      ...options,
    }).format(new Date(date));
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(config.intlLocale, {
      ...config.numberFormat,
      ...options,
    }).format(value);
  };

  return (
    <LocaleContext.Provider
      value={{
        locale,
        config,
        setLocale,
        formatCurrency,
        formatDate,
        formatNumber,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

