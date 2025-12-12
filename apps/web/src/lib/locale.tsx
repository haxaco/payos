'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'en-US' | 'en-EU' | 'es-LATAM';

export interface LocaleConfig {
  locale: Locale;
  currency: string;
  dateFormat: Intl.DateTimeFormatOptions;
  numberFormat: Intl.NumberFormatOptions;
}

const localeConfigs: Record<Locale, LocaleConfig> = {
  'en-US': {
    locale: 'en-US',
    currency: 'USD',
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
    currency: 'EUR',
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
    currency: 'USD', // LATAM uses USD for stablecoins
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

  const formatCurrency = (amount: number, currency?: string) => {
    const localeMap: Record<Locale, string> = {
      'en-US': 'en-US',
      'en-EU': 'en-GB', // Use GB for EU English
      'es-LATAM': 'es-MX', // Use Mexico as default LATAM locale
    };

    return new Intl.NumberFormat(localeMap[locale], {
      style: 'currency',
      currency: currency || config.currency,
      ...config.numberFormat,
    }).format(amount);
  };

  const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const localeMap: Record<Locale, string> = {
      'en-US': 'en-US',
      'en-EU': 'en-GB',
      'es-LATAM': 'es-MX',
    };

    return new Intl.DateTimeFormat(localeMap[locale], {
      ...config.dateFormat,
      ...options,
    }).format(new Date(date));
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    const localeMap: Record<Locale, string> = {
      'en-US': 'en-US',
      'en-EU': 'en-GB',
      'es-LATAM': 'es-MX',
    };

    return new Intl.NumberFormat(localeMap[locale], {
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

