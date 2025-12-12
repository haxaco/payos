export default function Loading() {
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-9 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
        <div className="h-5 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>

      {/* Content skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}
