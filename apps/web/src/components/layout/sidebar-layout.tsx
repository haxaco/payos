'use client';

import { useSidebar } from './sidebar-context';
import { cn } from '@sly/ui';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        'transition-all duration-300',
        collapsed ? 'lg:pl-20' : 'lg:pl-64'
      )}
    >
      {children}
    </div>
  );
}

