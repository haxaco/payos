import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - catches React errors and provides fallback UI
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // You can also log to an error reporting service here
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  Something went wrong
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                  {this.state.error.message || 'An unexpected error occurred'}
                </p>
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorDisplay - reusable error UI component
 */
interface ErrorDisplayProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorDisplay({ error, onRetry, title = 'Failed to load data' }: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{title}</h3>
        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * NetworkErrorDisplay - specialized for network errors
 */
export function NetworkErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      error="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
      title="Connection Error"
    />
  );
}

/**
 * NotFoundError - for 404 errors
 */
export function NotFoundError({ resource = 'resource', onGoBack }: { resource?: string; onGoBack?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {resource.charAt(0).toUpperCase() + resource.slice(1)} not found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
        The {resource} you're looking for doesn't exist or has been removed.
      </p>
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Go back
        </button>
      )}
    </div>
  );
}

