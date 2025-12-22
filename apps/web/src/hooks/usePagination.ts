import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginationControls {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
  startItem: number;
  endItem: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems: number;
}

/**
 * Reusable pagination hook for all list pages
 * Manages page state, page size, and navigation
 */
export function usePagination({
  initialPage = 1,
  initialPageSize = 50,
  totalItems,
}: UsePaginationOptions): PaginationControls {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  // Navigation flags
  const hasNext = useMemo(() => page < totalPages, [page, totalPages]);
  const hasPrev = useMemo(() => page > 1, [page]);

  // Calculate item range for current page
  const startItem = useMemo(() => {
    return totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  }, [page, pageSize, totalItems]);

  const endItem = useMemo(() => {
    return Math.min(page * pageSize, totalItems);
  }, [page, pageSize, totalItems]);

  // Navigation functions
  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback(
    (newPage: number) => {
      const clampedPage = Math.max(1, Math.min(newPage, totalPages));
      setPage(clampedPage);
    },
    [totalPages]
  );

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page when changing page size
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
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
    setPageSize: handleSetPageSize,
    reset,
  };
}

