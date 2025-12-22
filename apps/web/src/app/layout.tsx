import type { Metadata } from 'next';

import { Toaster } from 'sonner';
import { ApiClientProvider } from '@/lib/api-client';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'PayOS Dashboard',
  description: 'Stablecoin Payout Operating System for LATAM',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <ApiClientProvider>
            {children}
          </ApiClientProvider>
          <Toaster position="top-right" richColors />
        </ThemeProvider>

      </body>
    </html>
  );
}
