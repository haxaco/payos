'use client';

import { cn } from '@payos/ui';

// Base skeleton component
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
        className
      )}
    />
  );
}

// Dashboard stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
      <Skeleton className="w-24 h-4 mb-2" />
      <Skeleton className="w-32 h-8" />
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="w-full h-4" />
        </td>
      ))}
    </tr>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton className="w-20 h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Card list skeleton
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="w-32 h-5 mb-2" />
              <Skeleton className="w-48 h-4" />
            </div>
            <Skeleton className="w-20 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="w-32 h-8 mb-2" />
        <Skeleton className="w-48 h-4" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* AI Insights skeleton */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <Skeleton className="w-32 h-6 mb-4" />
            <div className="space-y-4">
              <Skeleton className="w-full h-16" />
              <Skeleton className="w-full h-16" />
              <Skeleton className="w-full h-16" />
            </div>
          </div>
          {/* Chart skeleton */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <Skeleton className="w-48 h-6 mb-4" />
            <Skeleton className="w-full h-64" />
          </div>
        </div>
        <div className="space-y-6">
          {/* Sidebar skeleton */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <Skeleton className="w-40 h-6 mb-4" />
            <div className="space-y-3">
              <Skeleton className="w-full h-12 rounded-xl" />
              <Skeleton className="w-full h-12 rounded-xl" />
              <Skeleton className="w-full h-12 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Agent detail skeleton
export function AgentDetailSkeleton() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <Skeleton className="w-32 h-4 mb-6" />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div>
            <Skeleton className="w-48 h-6 mb-2" />
            <Skeleton className="w-64 h-4" />
          </div>
        </div>
        <Skeleton className="w-24 h-8 rounded-full" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Tabs */}
      <Skeleton className="w-full h-12 mb-6" />
      
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <Skeleton className="w-32 h-6 mb-4" />
          <div className="space-y-4">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-8" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <Skeleton className="w-32 h-6 mb-4" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="w-20 h-8 rounded-full" />
            <Skeleton className="w-24 h-8 rounded-full" />
            <Skeleton className="w-28 h-8 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Stream detail skeleton
export function StreamDetailSkeleton() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <Skeleton className="w-32 h-4 mb-6" />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Skeleton className="w-64 h-8 mb-2" />
          <Skeleton className="w-48 h-4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-24 h-10 rounded-lg" />
          <Skeleton className="w-24 h-10 rounded-lg" />
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 mb-6">
        <Skeleton className="w-48 h-12 mb-4" />
        <div className="flex gap-8">
          <Skeleton className="w-32 h-6" />
          <Skeleton className="w-32 h-6" />
          <Skeleton className="w-32 h-6" />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <Skeleton className="w-32 h-6 mb-4" />
          <div className="space-y-4">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-8" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <Skeleton className="w-32 h-6 mb-4" />
          <div className="space-y-4">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

