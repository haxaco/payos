import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { LocaleProvider } from '@/lib/locale';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { RealtimeProvider } from '@/providers/realtime-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // Middleware handles auth redirection, so we don't need to double-check here
  // which can cause race conditions if the session cookie is being updated
  await getUser();

  return (
    <LocaleProvider>
      <SidebarProvider>
        <RealtimeProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-black">
            <Sidebar />
            <SidebarLayout>
              <Header user={user} />
              <main className="flex-1">
                {children}
              </main>
            </SidebarLayout>
          </div>
        </RealtimeProvider>
      </SidebarProvider>
    </LocaleProvider>
  );
}
