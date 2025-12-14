import { Search, Bell, Moon, Sun, Menu, ChevronDown, Box, Rocket } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [envMenuOpen, setEnvMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    
    if (newValue) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 gap-4">
      {/* Mobile menu toggle */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Global Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
          <input
            type="text"
            placeholder="Search or ask anything..."
            className="w-full pl-10 pr-16 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm z-10">
            ⌘K
          </kbd>
          {/* Search Results Dropdown - Placeholder for future implementation */}
          {/* TODO: Implement search results dropdown with proper z-index (z-50) */}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Environment Toggle */}
        <div className="relative">
          <button
            onClick={() => setEnvMenuOpen(!envMenuOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              environment === 'sandbox'
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
            }`}
          >
            {environment === 'sandbox' ? (
              <Box className="w-4 h-4" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            <span className="uppercase tracking-wide">
              {environment === 'sandbox' ? 'Sandbox' : 'Production'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {envMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setEnvMenuOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setEnvironment('sandbox');
                      setEnvMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      environment === 'sandbox'
                        ? 'bg-amber-50 dark:bg-amber-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      environment === 'sandbox'
                        ? 'bg-amber-100 dark:bg-amber-900/50'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Box className={`w-4 h-4 ${
                        environment === 'sandbox'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Sandbox</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Test with mock data</p>
                    </div>
                    {environment === 'sandbox' && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setEnvironment('production');
                      setEnvMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      environment === 'production'
                        ? 'bg-green-50 dark:bg-green-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      environment === 'production'
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Rocket className={`w-4 h-4 ${
                        environment === 'production'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Production</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Live transactions</p>
                    </div>
                    {environment === 'production' && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </button>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {environment === 'sandbox' 
                      ? 'Sandbox uses test data. No real money moves.'
                      : '⚠️ Production mode. Real transactions.'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Toggle dark mode"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"></span>
        </button>

        {/* Profile (Desktop) */}
        <div className="hidden md:flex items-center gap-3 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">John Smith</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
            JS
          </div>
        </div>
      </div>
    </header>
  );
}