'use client';

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeLink?: boolean;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  showHomeLink = true,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">{message}</p>
      <div className="flex items-center gap-3 mt-6">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
        {showHomeLink && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        )}
      </div>
    </div>
  );
}

// API Error State
export function ApiErrorState({ 
  error,
  onRetry,
}: { 
  error: Error | { message: string };
  onRetry?: () => void;
}) {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isAuthError = error.message.includes('401') || error.message.includes('unauthorized');
  const isRateLimitError = error.message.includes('429') || error.message.includes('rate limit');

  let title = 'Failed to load data';
  let message = error.message;

  if (isNetworkError) {
    title = 'Connection error';
    message = 'Unable to connect to the server. Please check your internet connection.';
  } else if (isAuthError) {
    title = 'Authentication required';
    message = 'Your session has expired. Please configure your API key.';
  } else if (isRateLimitError) {
    title = 'Too many requests';
    message = 'Please wait a moment before trying again.';
  }

  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
    />
  );
}

// Not Found State
export function NotFoundState({ 
  resourceType = 'resource',
  resourceId,
}: { 
  resourceType?: string;
  resourceId?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
        {resourceId 
          ? `We couldn't find a ${resourceType} with ID "${resourceId.slice(0, 8)}..."`
          : `The ${resourceType} you're looking for doesn't exist or has been removed.`
        }
      </p>
      <Link
        href="/dashboard"
        className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Home className="w-4 h-4" />
        Go to Dashboard
      </Link>
    </div>
  );
}

// Permission Denied State
export function PermissionDeniedState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Access denied
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
        You don't have permission to view this resource. Contact your administrator if you think this is a mistake.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Home className="w-4 h-4" />
        Go to Dashboard
      </Link>
    </div>
  );
}

