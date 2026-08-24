'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import {
  PlusCircle,
  FileText,
  Building2,
  Settings,
  LogOut,
  GraduationCap,
  Clock,
  FileSpreadsheet,
  Users,
  SlidersHorizontal,
  ChevronRight,
  ChevronsUpDown,
  Banknote,
  Receipt,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const { setOpenMobile, isMobile } = useSidebar()

  const [activeEntity, setActiveEntity] = useState<'edlink-pk' | 'edlink-au' | 'aimt' | 'other'>('edlink-pk')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [supabase])

  // Sync entity from pathname or localStorage
  useEffect(() => {
    if (pathname.startsWith('/installments')) {
      setActiveEntity('aimt')
      if (typeof window !== 'undefined') localStorage.setItem('active_entity', 'aimt')
    } else if (pathname.startsWith('/attendance')) {
      setActiveEntity('edlink-pk')
      if (typeof window !== 'undefined') localStorage.setItem('active_entity', 'edlink-pk')
    } else {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('active_entity')
        if (stored === 'aimt') setActiveEntity('aimt')
        else if (stored === 'edlink-au') setActiveEntity('edlink-au')
        else setActiveEntity('edlink-pk')
      }
    }
  }, [pathname])

  const email = user?.email || 'admin@isquarebpo.com'
  const initials = email.substring(0, 2).toUpperCase()

  async function handleLogout() {
    document.cookie = 'dev-auth-session=; path=/; max-age=0'
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Close mobile drawer when clicking any navigation link
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const isInvoiceActive =
    pathname.startsWith('/invoices') || pathname.startsWith('/companies')

  const isPayrollActive =
    pathname.startsWith('/attendance') || pathname.startsWith('/payroll')

  const isInstallmentsActive = pathname.startsWith('/installments')

  const [invoicesOpen, setInvoicesOpen] = useState(true)
  const [payrollOpen, setPayrollOpen] = useState(true)
  const [installmentsOpen, setInstallmentsOpen] = useState(true)

  useEffect(() => {
    if (isInvoiceActive) setInvoicesOpen(true)
  }, [isInvoiceActive])

  useEffect(() => {
    if (isPayrollActive) setPayrollOpen(true)
  }, [isPayrollActive])

  useEffect(() => {
    if (isInstallmentsActive) setInstallmentsOpen(true)
  }, [isInstallmentsActive])

  const isAimt = activeEntity === 'aimt' || pathname.startsWith('/installments')
  const isEdLinkAu = activeEntity === 'edlink-au'
  const isEdLinkPk = !isAimt && !isEdLinkAu

  // Header Title & Logo info
  const entityTitle = isAimt
    ? 'AIMT College'
    : isEdLinkAu
    ? 'EdLink Australia'
    : 'EdLink Pakistan'

  const entitySubtitle = isAimt
    ? 'Academic & Vocational'
    : isEdLinkAu
    ? 'Education & Visa (AU)'
    : 'Education & Visa (PK)'

  const entityPrefix = isAimt ? 'AIMT' : isEdLinkAu ? 'EDA' : 'EDL'
  const entityLogo = isAimt ? '/aimt-logo.png' : '/edlink-logo.png'

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/10 bg-[#001E2F] text-slate-100 font-sans select-none"
    >
      {/* 1. Header: Brand / Workspace Switcher */}
      <SidebarHeader className="p-3 border-b border-white/10 bg-[#001724]">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="hover:bg-[#0E3E5B]/80 text-slate-100 transition-colors data-[state=open]:bg-[#0E3E5B] rounded-lg p-1.5"
                  />
                }
              >
                <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-white p-1 shadow-sm shrink-0 border border-white/20">
                  <img
                    src={entityLogo}
                    alt={entityTitle}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-bold text-white tracking-tight font-['Montserrat'] text-[14px]">
                    {entityTitle}
                  </span>
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#81F5F5]/90">
                    {entitySubtitle}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-slate-400 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 rounded-xl bg-[#001E2F] border-slate-700 text-slate-100 shadow-2xl p-1.5"
                side="bottom"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-bold text-[#81F5F5] uppercase tracking-wider">
                  Active Entity
                </DropdownMenuLabel>
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0E3E5B] text-white">
                  <div className="size-7 rounded bg-white p-0.5 flex items-center justify-center">
                    <img
                      src={entityLogo}
                      alt={entityTitle}
                      className="max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 truncate text-xs font-bold">
                    {entityTitle}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-400/20 text-teal-300 font-mono font-bold">
                    {entityPrefix}
                  </span>
                </div>
                <DropdownMenuSeparator className="bg-white/10 my-1.5" />
                <DropdownMenuItem
                  render={<Link href="/portal" onClick={handleNavClick} className="flex items-center gap-2.5 w-full" />}
                  className="text-xs hover:bg-[#0E3E5B] hover:text-white cursor-pointer px-2.5 py-2 rounded-md transition-colors font-semibold text-slate-200"
                >
                  <Building2 className="size-4 text-[#81F5F5]" />
                  <span>Switch Entity / All Portals</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. Main Navigation Content */}
      <SidebarContent className="px-3 py-4 space-y-4 overflow-y-auto bg-[#001E2F]">
        {isAimt ? (
          /* =========================================================================
             AIMT ENTITY: Installments Schedule Module
             ========================================================================= */
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-[#81F5F5]/70 px-2.5 mb-1 group-data-[collapsible=icon]:hidden">
              Installments
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <Collapsible
                  open={installmentsOpen}
                  onOpenChange={setInstallmentsOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip="Installments"
                          className={`text-[13px] font-medium transition-all hover:bg-[#0E3E5B]/80 hover:text-white rounded-lg px-2.5 py-2 ${
                            isInstallmentsActive
                              ? 'text-[#81F5F5] bg-[#0E3E5B]'
                              : 'text-slate-300'
                          }`}
                        />
                      }
                    >
                      <GraduationCap className="size-4 shrink-0 text-[#81F5F5]" />
                      <span className="font-semibold text-slate-200">Installments</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90 text-slate-400 group-data-[collapsible=icon]:hidden" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-l border-white/15 ml-3.5 pl-2.5 space-y-1 mt-1.5 py-0.5">
                        {/* Create Schedule */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={<Link href="/installments/new" onClick={handleNavClick} />}
                            isActive={pathname === '/installments/new'}
                            className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                          >
                            <PlusCircle className="size-3.5 shrink-0" />
                            <span>Create Schedule</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        {/* Schedules */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={<Link href="/installments" onClick={handleNavClick} />}
                            isActive={pathname === '/installments'}
                            className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                          >
                            <FileText className="size-3.5 shrink-0" />
                            <span>Schedules</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : isEdLinkAu ? (
          /* =========================================================================
             EDLINK AUSTRALIA ENTITY: Official Invoices + Companies
             ========================================================================= */
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-[#81F5F5]/70 px-2.5 mb-1 group-data-[collapsible=icon]:hidden">
              Invoices
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <Collapsible
                  open={invoicesOpen}
                  onOpenChange={setInvoicesOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip="Invoices"
                          className={`text-[13px] font-medium transition-all hover:bg-[#0E3E5B]/80 hover:text-white rounded-lg px-2.5 py-2 ${
                            isInvoiceActive
                              ? 'text-[#81F5F5] bg-[#0E3E5B]'
                              : 'text-slate-300'
                          }`}
                        />
                      }
                    >
                      <Receipt className="size-4 shrink-0 text-[#81F5F5]" />
                      <span className="font-semibold text-slate-200">Invoices</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90 text-slate-400 group-data-[collapsible=icon]:hidden" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-l border-white/15 ml-3.5 pl-2.5 space-y-1 mt-1.5 py-0.5">
                        {/* Generate Invoice (EdLink Australia template) */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={<Link href="/invoices/new?company=edlink" onClick={handleNavClick} />}
                            isActive={pathname.startsWith('/invoices/new')}
                            className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                          >
                            <PlusCircle className="size-3.5 shrink-0" />
                            <span>Generate Invoice</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        {/* Invoices List */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={<Link href="/invoices" onClick={handleNavClick} />}
                            isActive={
                              pathname === '/invoices' ||
                              (pathname.startsWith('/invoices') && !pathname.includes('/new'))
                            }
                            className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                          >
                            <FileText className="size-3.5 shrink-0" />
                            <span>All Invoices</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        {/* Companies */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            render={<Link href="/companies" onClick={handleNavClick} />}
                            isActive={pathname.startsWith('/companies')}
                            className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                          >
                            <Building2 className="size-3.5 shrink-0" />
                            <span>Companies</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          /* =========================================================================
             EDLINK PAKISTAN ENTITY: Anonymous Invoices + Full Payroll (NO Companies)
             ========================================================================= */
          <>
            {/* Invoices Group */}
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-[#81F5F5]/70 px-2.5 mb-1 group-data-[collapsible=icon]:hidden">
                Invoices
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  <Collapsible
                    open={invoicesOpen}
                    onOpenChange={setInvoicesOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton
                            tooltip="Invoices"
                            className={`text-[13px] font-medium transition-all hover:bg-[#0E3E5B]/80 hover:text-white rounded-lg px-2.5 py-2 ${
                              isInvoiceActive
                                ? 'text-[#81F5F5] bg-[#0E3E5B]'
                                : 'text-slate-300'
                            }`}
                          />
                        }
                      >
                        <Receipt className="size-4 shrink-0 text-[#81F5F5]" />
                        <span className="font-semibold text-slate-200">Invoices</span>
                        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90 text-slate-400 group-data-[collapsible=icon]:hidden" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-l border-white/15 ml-3.5 pl-2.5 space-y-1 mt-1.5 py-0.5">
                          {/* Generate Invoice (Directly to Anonymous/Custom template) */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              render={<Link href="/invoices/new?company=anonymous" onClick={handleNavClick} />}
                              isActive={pathname.startsWith('/invoices/new')}
                              className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <PlusCircle className="size-3.5 shrink-0" />
                              <span>Generate Invoice</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {/* Invoices List */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              render={<Link href="/invoices" onClick={handleNavClick} />}
                              isActive={
                                pathname === '/invoices' ||
                                (pathname.startsWith('/invoices') && !pathname.includes('/new'))
                              }
                              className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <FileText className="size-3.5 shrink-0" />
                              <span>All Invoices</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Payroll Module Group (Specific to EdLink Pakistan) */}
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-[#81F5F5]/70 px-2.5 mb-1 group-data-[collapsible=icon]:hidden">
                Payroll Module
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  <Collapsible
                    open={payrollOpen}
                    onOpenChange={setPayrollOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton
                            tooltip="Payroll"
                            className={`text-[13px] font-medium transition-all hover:bg-[#0E3E5B]/80 hover:text-white rounded-lg px-2.5 py-2 ${
                              isPayrollActive
                                ? 'text-[#81F5F5] bg-[#0E3E5B]'
                                : 'text-slate-300'
                            }`}
                          />
                        }
                      >
                        <Banknote className="size-4 shrink-0 text-[#81F5F5]" />
                        <span className="font-semibold text-slate-200">Payroll</span>
                        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90 text-slate-400 group-data-[collapsible=icon]:hidden" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-l border-white/15 ml-3.5 pl-2.5 space-y-1 mt-1.5 py-0.5">
                          {/* Attendance Records */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              render={<Link href="/attendance/records" onClick={handleNavClick} />}
                              isActive={pathname === '/attendance/records'}
                              className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <Clock className="size-3.5 shrink-0" />
                              <span>Attendance Records</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {/* Employee Overview */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              render={<Link href="/attendance" onClick={handleNavClick} />}
                              isActive={
                                pathname === '/attendance' ||
                                pathname.startsWith('/attendance/employees')
                              }
                              className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <Users className="size-3.5 shrink-0" />
                              <span>Employee Overview</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {/* Import Excel */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              render={<Link href="/attendance/import" onClick={handleNavClick} />}
                              isActive={pathname === '/attendance/import'}
                              className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <FileSpreadsheet className="size-3.5 shrink-0" />
                              <span>Import Excel</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          {/* Settings */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              render={<Link href="/attendance/settings" onClick={handleNavClick} />}
                              isActive={pathname === '/attendance/settings'}
                              className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <SlidersHorizontal className="size-3.5 shrink-0" />
                              <span>Settings</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* 3. Footer: User Profile & Dropdown Menu */}
      <SidebarFooter className="p-2.5 border-t border-white/10 bg-[#001724]">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="hover:bg-[#0E3E5B]/80 text-slate-100 transition-colors data-[state=open]:bg-[#0E3E5B] rounded-lg px-2"
                  />
                }
              >
                <div className="size-8 rounded-lg bg-[#0E3E5B] text-[#81F5F5] font-bold text-xs flex items-center justify-center shrink-0 border border-white/10 shadow-xs">
                  {initials}
                </div>
                <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-white">
                    {email}
                  </span>
                  <span className="truncate text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    Administrator
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-slate-400 group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-60 rounded-xl bg-[#001E2F] border border-slate-700 text-slate-100 shadow-2xl p-1.5"
                side="top"
                align="end"
                sideOffset={10}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-3 py-2.5 text-left text-xs bg-[#001724] rounded-lg border border-white/5">
                    <div className="size-8 rounded-lg bg-[#0E3E5B] text-[#81F5F5] font-bold text-xs flex items-center justify-center shrink-0 border border-white/10">
                      {initials}
                    </div>
                    <div className="grid flex-1 text-left text-xs leading-tight min-w-0">
                      <span className="truncate font-semibold text-white">
                        {email}
                      </span>
                      <span className="truncate text-[10px] text-slate-400 font-medium">
                        Administrator
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10 my-1.5" />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    render={<Link href="/settings" onClick={handleNavClick} className="flex items-center gap-2.5 w-full" />}
                    className="text-xs hover:bg-[#0E3E5B] hover:text-white cursor-pointer px-3 py-2 rounded-md transition-colors font-medium text-slate-200"
                  >
                    <Settings className="size-4 text-[#81F5F5]" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/10 my-1.5" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer px-3 py-2 rounded-md flex items-center gap-2.5 transition-colors font-semibold"
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* 4. Rail for resizing / collapsing */}
      <SidebarRail />
    </Sidebar>
  )
}
