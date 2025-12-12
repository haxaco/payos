'use client';

import { CreditCard, Plus } from 'lucide-react';

export default function CardsPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cards</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage virtual and physical cards</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Issue Card
        </button>
      </div>

      {/* Coming Soon */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Cards Coming Soon
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
          Issue virtual and physical cards to your users. Set spending limits, enable/disable cards instantly, and track all transactions in real-time.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Feature in Development
        </div>
      </div>

      {/* Feature Preview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center mb-4">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Virtual Cards</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create unlimited virtual cards for online purchases with custom spending limits.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Physical Cards</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Order branded physical cards delivered to your users with PIN management.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-4">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Instant Controls</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Freeze, unfreeze, or cancel cards instantly. Set merchant category restrictions.
          </p>
        </div>
      </div>
    </div>
  );
}

