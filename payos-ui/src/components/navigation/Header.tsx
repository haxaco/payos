import { Search, Bell, Moon, Sun, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions, employers, contractors..."
            className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-sm">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
        </button>

        {/* Profile Menu */}
        <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <button className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces" 
              alt="Profile"
              className="w-8 h-8 rounded-full ring-2 ring-slate-200 dark:ring-slate-700"
            />
            <div className="hidden md:block text-left">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Alex Morgan</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">alex@payos.com</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
