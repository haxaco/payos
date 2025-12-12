import { Search, Bell, Moon, Sun, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function TopBar() {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
            ⌘ F
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile */}
        <button className="flex items-center gap-3 pl-2 pr-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="text-left hidden lg:block">
            <div className="text-sm font-medium text-gray-900 dark:text-white">Richard Azet</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">richard@payos.com</div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
