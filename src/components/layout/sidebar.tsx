'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  PlusCircle,
  FileText,
  Building2,
  Settings,
  LogOut,
  ReceiptText,
  GraduationCap,
  Clock,
  FileSpreadsheet,
  Users,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Banknote,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [invoicesExpanded, setInvoicesExpanded] = useState(true)
  const [payrollExpanded, setPayrollExpanded] = useState(true)

  async function handleLogout() {
    document.cookie = 'dev-auth-session=; path=/; max-age=0'
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isInvoiceActive =
    pathname.startsWith('/invoices') || pathname.startsWith('/companies')

  const isPayrollActive =
    pathname.startsWith('/attendance') || pathname.startsWith('/payroll')

  return (
    <aside className="w-64 bg-[#001E2F] text-slate-100 flex flex-col h-screen border-r border-slate-800 shrink-0 font-sans select-none overflow-hidden sticky top-0">
      {/* Stitch Logo Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800/80 gap-3 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-[#81F5F5] flex items-center justify-center shadow-sm">
          <ReceiptText className="w-6 h-6 text-[#002020]" />
        </div>
        <div>
          <h1 className="font-extrabold text-xl tracking-tight text-[#CAE6FF] font-['Montserrat']">
            InvoicePro
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#81F5F5]/80">
            Enterprise Billing
          </p>
        </div>
      </div>

      {/* Main Nav Items (Independent Scroll) */}
      <div className="flex-1 py-5 px-4 space-y-1 overflow-y-auto min-h-0">
        {/* Invoices Group Header */}
        <div className="px-2 mb-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/50">
            Invoices
          </p>
        </div>

        {/* Invoices Main Menu (Unlinked parent with submenu) */}
        <div>
          <button
            type="button"
            onClick={() => setInvoicesExpanded(!invoicesExpanded)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isInvoiceActive
                ? 'text-[#81F5F5] bg-[#13557A]/40'
                : 'text-slate-300 hover:text-white hover:bg-[#13557A]/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4" />
              <span>Invoices</span>
            </div>
            {invoicesExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Invoices Submenu Items */}
          {invoicesExpanded && (
            <div className="mt-1 ml-3 pl-3 border-l border-slate-700/60 space-y-1">
              {/* 1. Generate Invoices */}
              <Link
                href="/invoices/select-company"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname.startsWith('/invoices/new') || pathname.startsWith('/invoices/select-company')
                    ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#13557A]/60'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Generate Invoices</span>
              </Link>

              {/* 2. Invoices */}
              <Link
                href="/invoices"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname === '/invoices' || (pathname.startsWith('/invoices') && !pathname.includes('/new') && !pathname.includes('/select-company'))
                    ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#13557A]/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </Link>

              {/* 3. Companies */}
              <Link
                href="/companies"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname.startsWith('/companies')
                    ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#13557A]/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Companies</span>
              </Link>
            </div>
          )}
        </div>

        {/* Visual Divider - Payroll Module */}
        <div className="my-5 pt-4 border-t border-slate-800/80 px-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/50 mb-2">
            Payroll Module
          </p>
        </div>

        {/* Payroll Main Menu (Unlinked parent with submenu) */}
        <div>
          <button
            type="button"
            onClick={() => setPayrollExpanded(!payrollExpanded)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isPayrollActive
                ? 'text-[#81F5F5] bg-[#13557A]/40'
                : 'text-slate-300 hover:text-white hover:bg-[#13557A]/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Banknote className="w-4 h-4" />
              <span>Payroll</span>
            </div>
            {payrollExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Payroll Submenu Items */}
          {payrollExpanded && (
            <div className="mt-1 ml-3 pl-3 border-l border-slate-700/60 space-y-1">
              {/* 1. Attendance Records */}
              <Link
                href="/attendance/records"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname === '/attendance/records'
                    ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#13557A]/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Attendance Records</span>
              </Link>

              {/* 2. Employee Overview */}
              <Link
                href="/attendance"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname === '/attendance' || pathname.startsWith('/attendance/employees')
                    ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#13557A]/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Employee Overview</span>
              </Link>

              {/* 3. Import Excel */}
              <Link
                href="/attendance/import"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname === '/attendance/import'
                    ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#13557A]/60'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </Link>

              {/* 4. Settings (Renamed from Attendance Rules) */}
              <Link
                href="/attendance/settings"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname === '/attendance/settings'
                    ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#13557A]/60'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>
            </div>
          )}
        </div>

        {/* Visual Divider - Academic & System */}
        <div className="my-5 pt-4 border-t border-slate-800/80 px-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/50 mb-2">
            Academic & System
          </p>
        </div>

        {/* Installments */}
        <Link
          href="/installments"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            pathname.startsWith('/installments')
              ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-[#13557A]/80'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Installments</span>
        </Link>
      </div>

      {/* User / Settings & Logout Footer (Fixed at bottom) */}
      <div className="p-3 border-t border-slate-800/80 shrink-0 space-y-1 bg-[#001724]">
        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            pathname === '/settings'
              ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-[#13557A]/80'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-[#13557A]/50 transition-colors text-xs font-bold uppercase tracking-wider gap-3 px-4 py-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  )
}
