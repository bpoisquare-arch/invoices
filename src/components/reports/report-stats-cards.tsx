'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, DollarSign, Clock, AlertCircle, TrendingUp, Sparkles } from 'lucide-react'

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
      {/* 1. Total Students */}
      <Card className="relative bg-gradient-to-b from-white to-slate-50/80 border border-slate-200/80 text-slate-900 shadow-xs hover:shadow-md hover:border-[#003D5C]/30 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#003D5C] to-cyan-500" />
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Students
              </p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {totalStudents.toLocaleString()}
            </h3>
            <div className="pt-0.5">
              {selectedCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200/80">
                  <Sparkles className="size-3" />
                  {selectedCount} row(s) selected
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium">
                  Active database records
                </span>
              )}
            </div>
          </div>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#003D5C] to-[#00283d] text-cyan-300 flex items-center justify-center shadow-md shadow-[#003D5C]/15 shrink-0 group-hover:scale-105 transition-transform">
            <Users className="size-6" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Pending Amount */}
      <Card className="relative bg-gradient-to-b from-white to-amber-50/30 border border-slate-200/80 text-slate-900 shadow-xs hover:shadow-md hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Pending Amount
              </p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight font-mono">
              {formattedPendingAmount}
            </h3>
            <p className="text-[11px] text-amber-700/80 font-medium pt-0.5 flex items-center gap-1">
              Outstanding student fee
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <DollarSign className="size-6" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Pending Invoices */}
      <Card className="relative bg-gradient-to-b from-white to-rose-50/30 border border-slate-200/80 text-slate-900 shadow-xs hover:shadow-md hover:border-rose-300 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pending Invoices
              </p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight font-mono">
              {pendingInvoicesCount.toLocaleString()}
            </h3>
            <p className="text-[11px] text-rose-700/80 font-medium pt-0.5 flex items-center gap-1">
              Invoices due for collection
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="size-6" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Yet to Raised */}
      <Card className="relative bg-gradient-to-b from-white to-emerald-50/30 border border-slate-200/80 text-slate-900 shadow-xs hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Yet to Raised
              </p>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight font-mono">
              {totalYetToRaised > 0 ? formattedYetToRaised : '$0'}
            </h3>
            <p className="text-[11px] text-emerald-700/80 font-medium pt-0.5 flex items-center gap-1">
              Unraised installments
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
            <AlertCircle className="size-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
