import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

export const BacklinkPagination = ({
  pagination = {},
  onPageChange,
  onLimitChange
}) => {
  const {
    total = 0,
    page = 1,
    limit = 10,
    totalPages = 1,
    hasPrevPage = false,
    hasNextPage = false
  } = pagination;

  if (total === 0) return null;

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 text-xs text-text-muted">
      {/* Records Range Counter */}
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-mono font-semibold text-text-primary">{formatNumber(startRecord)}</span> to{' '}
          <span className="font-mono font-semibold text-text-primary">{formatNumber(endRecord)}</span> of{' '}
          <span className="font-mono font-semibold text-text-primary">{formatNumber(total)}</span> backlinks
        </span>

        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-white/[0.08]">
          <span className="text-[11px]">Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-[#101318] border border-white/[0.08] text-text-primary rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500/50 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <span className="text-[11px] font-mono mr-2">
          Page {page} of {totalPages}
        </span>

        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage}
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary border border-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary border border-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary border border-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-text-primary border border-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
