'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, DollarSign, Clock, AlertCircle, TrendingUp } from 'lucide-react'

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
      <Card className="bg-white border border-slate-200/90 text-slate-900 shadow-xs hover:shadow-md hover:border-slate-300 transition-all rounded-2xl overflow-hidden">
        <CardContent className="p-4.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Students
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tracking-tight font-['Montserrat']">
              {totalStudents.toLocaleString()}
            </h3>
            <p className="text-[11px] text-cyan-700 font-semibold mt-1">
              {selectedCount > 0 ? `${selectedCount} row(s) selected` : 'Active database records'}
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-200/80 shadow-xs shrink-0">
            <Users className="size-6" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Pending Amount */}
      <Card className="bg-white border border-slate-200/90 text-slate-900 shadow-xs hover:shadow-md hover:border-amber-300 transition-all rounded-2xl overflow-hidden">
        <CardContent className="p-4.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Pending Amount
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1 tracking-tight font-['Montserrat']">
              {formattedPendingAmount}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Outstanding student fee
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80 shadow-xs shrink-0">
            <DollarSign className="size-6" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Pending Invoices */}
      <Card className="bg-white border border-slate-200/90 text-slate-900 shadow-xs hover:shadow-md hover:border-rose-300 transition-all rounded-2xl overflow-hidden">
        <CardContent className="p-4.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Invoices
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1 tracking-tight font-['Montserrat']">
              {pendingInvoicesCount.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Invoices due for collection
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/80 shadow-xs shrink-0">
            <Clock className="size-6" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Yet to Raised */}
      <Card className="bg-white border border-slate-200/90 text-slate-900 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all rounded-2xl overflow-hidden">
        <CardContent className="p-4.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Yet to Raised
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1 tracking-tight font-['Montserrat']">
              {totalYetToRaised > 0 ? formattedYetToRaised : '$0'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Unraised installments
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shadow-xs shrink-0">
            <AlertCircle className="size-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
