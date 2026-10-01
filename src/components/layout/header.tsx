'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Home } from 'lucide-react'

// Explicit title map for full routes
const fullRouteNameMap: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/reports': 'AIMT Report Management',
  '/stc': 'STC Entity',
  '/stc/reports': 'STC Report Management',
  '/stc/installments': 'STC Installments Ledger',
  '/invoices': 'Invoices',
  '/invoices/create': 'Create Invoice',
  '/installments': 'Installments Ledger',
  '/payslips': 'Payslips',
  '/attendance': 'Attendance Management',
  '/attendance/records': 'Daily Log Records',
  '/attendance/employees': 'Staff Directory',
  '/attendance/payslips': 'Payslip Management',
  '/attendance/import': 'Import CSV Data',
  '/attendance/settings': 'Attendance Settings',
  '/companies': 'Company Management',
  '/templates': 'Invoice Templates',
  '/settings': 'System Settings',
  '/edlink': 'Edlink Payslips',
}

// Fallback segment titles
const segmentNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  reports: 'Reports',
  stc: 'STC Entity',
  invoices: 'Invoices',
  create: 'Create',
  installments: 'Installments',
  payslips: 'Payslips',
  attendance: 'Attendance',
  records: 'Records',
  employees: 'Employees',
  import: 'Import',
  settings: 'Settings',
  companies: 'Companies',
  templates: 'Templates',
  edlink: 'Edlink',
}

export default function Header() {
  const pathname = usePathname() || '/'
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-2xs font-sans">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="-ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md shrink-0" />
        <Separator orientation="vertical" className="h-4 hidden sm:block bg-slate-200 shrink-0" />

        {/* Dynamic Breadcrumb Navigation for Desktop & Tablet */}
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList className="text-xs sm:text-sm font-medium">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />} className="flex items-center gap-1.5 font-bold text-[#003D5C] hover:text-[#009D9E] transition-colors">
                <Home className="size-3.5 text-[#009D9E]" />
                <span>MIS</span>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {segments.map((segment, index) => {
              const url = `/${segments.slice(0, index + 1).join('/')}`
              const isLast = index === segments.length - 1

              // Check full path map first, fallback to segment map or formatted string
              const title =
                fullRouteNameMap[url] ||
                segmentNameMap[segment.toLowerCase()] ||
                segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

              return (
                <React.Fragment key={url}>
                  <BreadcrumbSeparator className="text-slate-300" />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-extrabold text-[#003D5C] tracking-tight">
                        {title}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={url} />} className="font-semibold text-slate-500 hover:text-[#009D9E] transition-colors">
                        {title}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Compact Title for Mobile Screens */}
        <h2 className="sm:hidden font-['Geist'] text-sm font-extrabold text-[#003D5C] tracking-tight truncate max-w-[220px]">
          {fullRouteNameMap[pathname] ||
            (segments.length > 0
              ? segmentNameMap[segments[segments.length - 1].toLowerCase()] || segments[segments.length - 1]
              : 'MIS')}
        </h2>
      </div>
    </header>
  )
}
