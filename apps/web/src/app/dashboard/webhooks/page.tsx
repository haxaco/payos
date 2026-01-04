'use client';

import { Webhook, Plus } from 'lucide-react';
import Link from 'next/link';
import { useApiConfig } from '@/lib/api-client';

export default function WebhooksPage() {
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Webhooks</h1>
            <p className="text-gray-600 dark:text-gray-400">Configure webhook endpoints for real-time events</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center animate-pulse">
          <div className="h-16 w-16 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-4"></div>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mx-auto mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to manage webhooks.
          </p>
          <Link
            href="/dashboard/api-keys"
            className="inline-flex mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Configure API Key
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Webhooks</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure webhook endpoints for real-time events</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </button>
      </div>

      {/* Coming Soon */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
        <Webhook className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Webhooks Coming Soon</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Webhook management is under development. You'll be able to configure endpoints to receive real-time notifications for events like transfers, stream updates, and more.
        </p>
      </div>
    </div>
  );
}

