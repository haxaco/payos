import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Sidebar />
      <div className="lg:pl-64">
        <Header user={user} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
