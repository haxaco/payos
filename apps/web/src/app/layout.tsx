import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { ApiClientProvider } from '@/lib/api-client';
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
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <ApiClientProvider>
          {children}
        </ApiClientProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

