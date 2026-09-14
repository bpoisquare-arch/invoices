'use client'

import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

export interface TablePaginationProps {
  totalEntries: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  theme?: 'light' | 'dark'
  className?: string
}

export default function TablePagination({
  totalEntries,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  theme = 'light',
  className = '',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  const startEntry = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const endEntry = Math.min(safeCurrentPage * pageSize, totalEntries)

  const isDark = theme === 'dark'

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3.5 select-none ${
        isDark
          ? 'bg-[#001724] border-t border-white/10 text-slate-300'
          : 'bg-white border-t border-slate-200 text-slate-600'
      } ${className}`}
    >
      {/* Left side: Showing X to Y of Z entries */}
      <div className="text-xs font-medium">
        Showing <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{startEntry}</span> to{' '}
        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{endEntry}</span> of{' '}
        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalEntries}</span> entries
      </div>

      {/* Right side: Controls */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Rows per page selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Rows per page</span>
          <div className="relative inline-block">
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value)
                onPageSizeChange(newSize)
                onPageChange(1)
              }}
              className={`h-8 pl-2.5 pr-7 py-1 text-xs font-semibold rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-1 transition-colors ${
                isDark
                  ? 'bg-[#001E2F] border-slate-700 text-white focus:ring-[#81F5F5] focus:border-[#81F5F5]'
                  : 'bg-white border-slate-200 text-slate-800 focus:ring-slate-400 focus:border-slate-400'
              }`}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className={isDark ? 'bg-[#001E2F] text-white' : 'bg-white text-slate-900'}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Page indicator: Page X of Y */}
        <div className="text-xs font-medium whitespace-nowrap">
          Page <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{safeCurrentPage}</span> of{' '}
          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalPages}</span>
        </div>

        {/* Navigation Buttons: <<, <, >, >> */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            aria-label="First page"
            className={`size-8 inline-flex items-center justify-center rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
              isDark
                ? 'border-slate-700 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white disabled:hover:bg-white/5'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 disabled:hover:bg-white'
            }`}
          >
            <ChevronsLeft className="size-4" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage <= 1}
            aria-label="Previous page"
            className={`size-8 inline-flex items-center justify-center rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
              isDark
                ? 'border-slate-700 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white disabled:hover:bg-white/5'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 disabled:hover:bg-white'
            }`}
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Next page"
            className={`size-8 inline-flex items-center justify-center rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
              isDark
                ? 'border-slate-700 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white disabled:hover:bg-white/5'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 disabled:hover:bg-white'
            }`}
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage >= totalPages}
            aria-label="Last page"
            className={`size-8 inline-flex items-center justify-center rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
              isDark
                ? 'border-slate-700 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white disabled:hover:bg-white/5'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 disabled:hover:bg-white'
            }`}
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
