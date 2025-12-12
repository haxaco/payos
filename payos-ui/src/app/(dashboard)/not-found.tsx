import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <FileQuestion className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Page not found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The page you're looking for doesn't exist
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
