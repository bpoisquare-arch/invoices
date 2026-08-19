'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCompanies } from '@/lib/services/company.service'
import { getInvoices } from '@/lib/services/invoice.service'
import { Company, InvoiceWithDetails } from '@/lib/supabase/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Receipt, Plus, ArrowRight, Loader2, Download, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [recentInvoices, setRecentInvoices] = useState<InvoiceWithDetails[]>([])
  const [totalInvoicesCount, setTotalInvoicesCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        await fetch('/api/setup-db')
        const comps = await getCompanies()
        const invRes = await getInvoices({ page: 1, pageSize: 5, sortBy: 'newest' })

        setCompanies(comps)
        setRecentInvoices(invRes.invoices)
        setTotalInvoicesCount(invRes.totalCount)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Montserrat'] text-2xl font-bold text-[#003D5C] tracking-tight">
            Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your enterprise billing operations.
          </p>
        </div>
        <Link href="/invoices/select-company">
          <Button className="bg-[#009D9E] hover:bg-[#007A7A] text-white px-6 py-3 font-bold uppercase tracking-wider text-xs gap-2 shadow-xs transition-colors">
            <Plus className="w-4 h-4" />
            QUICK GENERATE INVOICE
          </Button>
        </Link>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Total Companies */}
        <Card className="bg-white border border-[#E2E8F0] shadow-2xs p-6 flex flex-col justify-between rounded-lg">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Companies
            </span>
            <div className="p-2 bg-[#13557A]/10 rounded-lg text-[#003D5C]">
              <Building2 className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-['Montserrat'] text-4xl font-extrabold text-slate-900">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : companies.length}
            </div>
            <div className="flex items-center text-[#92CA37] mt-2 text-xs font-semibold">
              <TrendingUp className="w-4 h-4 mr-1 text-[#92CA37]" />
              <span>Active Multi-Company Billing Entities</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Invoices */}
        <Card className="bg-white border border-[#E2E8F0] shadow-2xs p-6 flex flex-col justify-between rounded-lg">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Invoices
            </span>
            <div className="p-2 bg-[#13557A]/10 rounded-lg text-[#003D5C]">
              <Receipt className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-['Montserrat'] text-4xl font-extrabold text-slate-900">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : totalInvoicesCount}
            </div>
            <div className="flex items-center text-[#92CA37] mt-2 text-xs font-semibold">
              <TrendingUp className="w-4 h-4 mr-1 text-[#92CA37]" />
              <span>Lifetime Generated Invoices</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices Table */}
      <Card className="bg-white border border-[#E2E8F0] shadow-2xs rounded-lg overflow-hidden">
        <CardHeader className="p-6 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-['Montserrat'] text-lg font-bold text-[#003D5C]">
              Recent Invoices
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Latest generated enterprise invoices</p>
          </div>
          <Link href="/invoices">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-[#003D5C] font-semibold border-slate-300">
              View All Invoices
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#003D5C]" />
              <span>Loading recent invoices...</span>
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm">No invoices generated yet.</p>
              <Link href="/invoices/select-company">
                <Button size="sm" className="bg-[#009D9E] text-white gap-2 font-bold uppercase text-xs">
                  <Plus className="w-4 h-4" />
                  Generate First Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-slate-600 font-bold uppercase tracking-wider border-b border-[#E2E8F0] text-[11px]">
                    <th className="py-3.5 px-6">Invoice Number</th>
                    <th className="py-3.5 px-6">Company</th>
                    <th className="py-3.5 px-6">Customer Name</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6 text-right">Total Amount</th>
                    <th className="py-3.5 px-6 text-center">Download PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#003D5C]/5 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-[#003D5C] text-sm">
                        {inv.invoice_number}
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {inv.template_snapshot?.company_name || inv.companies?.name || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-slate-900 font-bold">{inv.customer_name}</td>
                      <td className="py-4 px-6 text-slate-600 font-mono">{inv.invoice_date}</td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 text-sm">
                        {Number(inv.total_amount).toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 font-semibold font-sans">
                          {inv.template_snapshot?.currency || inv.companies?.currency || 'AUD'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <a href={`/api/pdf/${inv.id}`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-[#009D9E]">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
