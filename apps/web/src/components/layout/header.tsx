'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Bell, LogOut, Settings, User, Search, ChevronDown, Check } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useState } from 'react';
import { ThemeToggleSimple } from '@/components/theme-toggle';

type Environment = 'sandbox' | 'production';

interface HeaderProps {
  user: SupabaseUser;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const [environment, setEnvironment] = useState<Environment>('sandbox');

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleEnvironmentChange = (env: Environment) => {
    setEnvironment(env);
    setShowEnvMenu(false);
    // TODO: In the future, this would switch API endpoints
  };

  const initials = user.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <>
      <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search or ask anything..."
              className="w-full pl-10 pr-16 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400 font-medium">
              ⌘K
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Environment Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowEnvMenu(!showEnvMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                environment === 'sandbox'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                environment === 'sandbox' ? 'bg-emerald-500' : 'bg-orange-500'
              }`} />
              {environment === 'sandbox' ? 'SANDBOX' : 'PRODUCTION'}
              <ChevronDown className="w-4 h-4" />
            </button>

            {showEnvMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowEnvMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-20 overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => handleEnvironmentChange('sandbox')}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Sandbox
                      </div>
                      {environment === 'sandbox' && <Check className="w-4 h-4 text-emerald-500" />}
                    </button>
                    <button
                      onClick={() => handleEnvironmentChange('production')}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Production
                      </div>
                      {environment === 'production' && <Check className="w-4 h-4 text-orange-500" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggleSimple />

          {/* Notifications */}
          <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {userName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Admin
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {userName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>
                  <div className="py-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/dashboard/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-800 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
