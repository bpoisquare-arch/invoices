'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  LayoutTemplate,
  Building2,
  Settings,
  LogOut,
  ReceiptText,
  GraduationCap,
  Clock,
  FileSpreadsheet,
  Users,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const invoiceNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Generate Invoice', href: '/invoices/new', icon: PlusCircle, highlight: true },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Companies', href: '/companies', icon: Building2 },
]

const attendanceNavItems = [
  { name: 'Employee Overview', href: '/attendance', icon: Users },
  { name: 'Attendance Records', href: '/attendance/records', icon: Clock },
  { name: 'Import Excel', href: '/attendance/import', icon: FileSpreadsheet },
  { name: 'Attendance Rules', href: '/attendance/settings', icon: SlidersHorizontal },
]

const secondaryNavItems = [
  { name: 'Installments', href: '/installments', icon: GraduationCap },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    document.cookie = 'dev-auth-session=; path=/; max-age=0'
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const renderLink = (item: typeof invoiceNavItems[0]) => {
    const Icon = item.icon
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

    if (item.highlight) {
      return (
        <Link
          key={item.name}
          href={item.href}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#009D9E] text-white hover:bg-[#007A7A] transition-all shadow-sm my-3"
        >
          <Icon className="w-4 h-4" />
          <span>{item.name}</span>
        </Link>
      )
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
          isActive
            ? 'bg-[#81F5F5] text-[#002020] shadow-sm'
            : 'text-slate-300 hover:text-white hover:bg-[#13557A]/80'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span>{item.name}</span>
      </Link>
    )
  }

  return (
    <aside className="w-64 bg-[#001E2F] text-slate-100 flex flex-col min-h-screen border-r border-slate-800 shrink-0 font-sans">
      {/* Stitch Logo Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800/80 gap-3">
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

      {/* Main Nav Items */}
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        {/* Invoice Module Group */}
        <div className="space-y-1.5">
          {invoiceNavItems.map(renderLink)}
        </div>

        {/* Visual Divider - Attendance Management */}
        <div className="my-5 pt-4 border-t border-slate-800/80 px-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/50 mb-2">
            Attendance Module
          </p>
        </div>

        {/* Attendance Module Group */}
        <div className="space-y-1.5">
          {attendanceNavItems.map(renderLink)}
        </div>

        {/* Visual Divider - Academic & System */}
        <div className="my-5 pt-4 border-t border-slate-800/80 px-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/50 mb-2">
            Academic & System
          </p>
        </div>

        {/* Secondary Module Group */}
        <div className="space-y-1.5">
          {secondaryNavItems.map(renderLink)}
        </div>
      </div>

      {/* User / Logout Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-[#13557A]/50 transition-colors text-xs font-bold uppercase tracking-wider gap-3 px-4 py-2.5"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  )
}
