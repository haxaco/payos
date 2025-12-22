'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@payos/ui';
import { PaginationControls as PaginationState } from '@/hooks/usePagination';
import { useState, KeyboardEvent } from 'react';

interface PaginationControlsProps {
  pagination: PaginationState;
  className?: string;
  showPageSize?: boolean;
  showJumpTo?: boolean;
  pageSizeOptions?: number[];
}

/**
 * Reusable pagination controls component
 * Works with both table rows and card grids
 */
export function PaginationControls({
  pagination,
  className = '',
  showPageSize = true,
  showJumpTo = true,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationControlsProps) {
  const {
    page,
    pageSize,
    totalPages,
    totalItems,
    hasNext,
    hasPrev,
    startItem,
    endItem,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
  } = pagination;

  const [jumpToValue, setJumpToValue] = useState('');

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7; // Show max 7 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      // Adjust range if near boundaries
      if (page <= 3) {
        end = Math.min(5, totalPages - 1);
      } else if (page >= totalPages - 2) {
        start = Math.max(2, totalPages - 4);
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleJumpTo = () => {
    const pageNumber = parseInt(jumpToValue);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
      setJumpToValue('');
    }
  };

  const handleJumpToKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpTo();
    }
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Left: Items count and page size selector */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-medium text-gray-900 dark:text-white">{startItem}</span> to{' '}
          <span className="font-medium text-gray-900 dark:text-white">{endItem}</span> of{' '}
          <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> results
        </div>

        {showPageSize && (
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-600 dark:text-gray-400">
              Show:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-2">
        {/* First Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(1)}
          disabled={!hasPrev}
          className="h-9 w-9 p-0"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={prevPage}
          disabled={!hasPrev}
          className="h-9 w-9 p-0"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((pageNum, index) =>
            pageNum === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-gray-400 dark:text-gray-600"
              >
                ...
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPage(pageNum)}
                className="h-9 min-w-[36px] px-3"
              >
                {pageNum}
              </Button>
            )
          )}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={!hasNext}
          className="h-9 w-9 p-0"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(totalPages)}
          disabled={!hasNext}
          className="h-9 w-9 p-0"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: Jump to page */}
      {showJumpTo && totalPages > 10 && (
        <div className="flex items-center gap-2">
          <label htmlFor="jumpTo" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            Go to:
          </label>
          <input
            id="jumpTo"
            type="number"
            min="1"
            max={totalPages}
            value={jumpToValue}
            onChange={(e) => setJumpToValue(e.target.value)}
            onKeyDown={handleJumpToKeyDown}
            placeholder="Page"
            className="w-20 px-3 py-1.5 text-sm bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleJumpTo}
            disabled={!jumpToValue}
            className="h-9"
          >
            Go
          </Button>
        </div>
      )}
    </div>
  );
}

