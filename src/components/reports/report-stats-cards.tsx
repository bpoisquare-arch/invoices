'use client'

import React from 'react'
import { Users, DollarSign, Clock, AlertCircle, Sparkles, TrendingUp } from 'lucide-react'

interface ReportStatsCardsProps {
  totalStudents: number
  totalPendingAmount: number
  pendingInvoicesCount: number
  totalYetToRaised: number
  selectedCount?: number
}

export default function ReportStatsCards({
  totalStudents,
  totalPendingAmount,
  pendingInvoicesCount,
  totalYetToRaised,
  selectedCount = 0,
}: ReportStatsCardsProps) {
  const formattedPendingAmount = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(totalPendingAmount)

  const formattedYetToRaised = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(totalYetToRaised)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Students (Deep Navy + Cyan Glow) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001724] via-[#002b40] to-[#003D5C] p-5 text-white shadow-md border border-cyan-500/20 group hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-cyan-500/10 blur-xl group-hover:scale-125 transition-transform duration-500" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/90 bg-white/10 px-2 py-0.5 rounded-md">
              Total Students
            </span>
            <h3 className="text-3xl font-black tracking-tight text-white mt-2 font-mono">
              {totalStudents.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Active database records
            </p>
          </div>
          <div className="size-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-[#81F5F5] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <Users className="size-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-[#81F5F5]">
          <span>
            {selectedCount > 0 ? `${selectedCount} row(s) selected` : 'AIMT Roster'}
          </span>
          <span className="font-bold flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-[#81F5F5] animate-pulse" />
            Live Database
          </span>
        </div>
      </div>

      {/* 2. Total Pending Amount (Sunset Flame Amber / Orange) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C2D12] via-[#C2410C] to-[#EA580C] p-5 text-white shadow-md border border-orange-400/30 group hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-orange-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-200 bg-white/15 px-2 py-0.5 rounded-md">
              Total Pending Amount
            </span>
            <h3 className="text-3xl font-black tracking-tight text-white mt-2 font-mono">
              {formattedPendingAmount}
            </h3>
            <p className="text-xs text-orange-100 font-medium mt-1">
              Outstanding student fee
            </p>
          </div>
          <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <DollarSign className="size-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-orange-100">
          <span>Fee Due for Collection</span>
          <span className="font-bold">Pending Amount</span>
        </div>
      </div>

      {/* 3. Pending Invoices (Vibrant Crimson / Rose) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#831843] via-[#BE185D] to-[#E11D48] p-5 text-white shadow-md border border-rose-400/30 group hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-rose-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-200 bg-white/15 px-2 py-0.5 rounded-md">
              Pending Invoices
            </span>
            <h3 className="text-3xl font-black tracking-tight text-white mt-2 font-mono">
              {pendingInvoicesCount.toLocaleString()}
            </h3>
            <p className="text-xs text-rose-100 font-medium mt-1">
              Invoices due for collection
            </p>
          </div>
          <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <Clock className="size-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-rose-100">
          <span>Follow-up Required</span>
          <span className="font-bold">Active Invoices</span>
        </div>
      </div>

      {/* 4. Yet to Raised (Vibrant Emerald / Teal) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#004D40] via-[#00695C] to-[#00897B] p-5 text-white shadow-md border border-teal-400/30 group hover:-translate-y-0.5 transition-all duration-200">
        <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-teal-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-200 bg-white/15 px-2 py-0.5 rounded-md">
              Yet To Raised
            </span>
            <h3 className="text-3xl font-black tracking-tight text-white mt-2 font-mono">
              {totalYetToRaised > 0 ? formattedYetToRaised : '$0'}
            </h3>
            <p className="text-xs text-teal-100 font-medium mt-1">
              Unraised installments
            </p>
          </div>
          <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <AlertCircle className="size-6" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-100">
          <span>Future Pipeline</span>
          <span className="font-bold">Scheduled</span>
        </div>
      </div>
    </div>
  )
}
