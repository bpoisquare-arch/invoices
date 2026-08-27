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
  Sparkles,
  Headphones,
  Check,
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface EntityItem {
  id: string
  name: string
  shortName: string
  subtitle: string
  prefix: string
  logo?: string
  icon?: any
  route: string
  shortcut: string
}

const ENTITIES: EntityItem[] = [
  {
    id: 'edlink-pk',
    name: 'EdLink Pakistan',
    shortName: 'EdLink PK',
    subtitle: 'Education & Visa (PK)',
    prefix: 'EDL',
    logo: '/edlink-logo.png',
    route: '/invoices',
    shortcut: '⌘1',
  },
  {
    id: 'edlink-au',
    name: 'EdLink Australia',
    shortName: 'EdLink AU',
    subtitle: 'Education & Visa (AU)',
    prefix: 'EDA',
    logo: '/edlink-logo.png',
    route: '/invoices',
    shortcut: '⌘2',
  },
  {
    id: 'aimt',
    name: 'AIMT College',
    shortName: 'AIMT',
    subtitle: 'Academic & Vocational',
    prefix: 'AIMT',
    logo: '/aimt-logo.png',
    route: '/installments',
    shortcut: '⌘3',
  },
  {
    id: 'nsc',
    name: 'Neighbourhood Shine Co.',
    shortName: 'NSC',
    subtitle: 'Cleaning & Maintenance',
    prefix: 'NSC',
    logo: '/Neighbourhood-Shine.png',
    route: '/invoices?entity=nsc',
    shortcut: '⌘4',
  },
  {
    id: 'isquare-bpo',
    name: 'ISquare BPO',
    shortName: 'ISQ',
    subtitle: 'BPO & IT Outsourcing',
    prefix: 'ISQ',
    logo: '/isquarebpo.png',
    route: '/invoices?entity=isq',
    shortcut: '⌘5',
  },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const { setOpenMobile, isMobile } = useSidebar()

  const [activeEntity, setActiveEntity] = useState<string>('edlink-pk')
  const [entityMenuOpen, setEntityMenuOpen] = useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

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
        else if (stored === 'nsc') setActiveEntity('nsc')
        else if (stored === 'isquare-bpo') setActiveEntity('isquare-bpo')
        else setActiveEntity('edlink-pk')
      }
    }
  }, [pathname])

  // Click outside to close team switcher dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setEntityMenuOpen(false)
      }
    }
    if (entityMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [entityMenuOpen])

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

  const handleSelectEntity = (entity: EntityItem) => {
    setActiveEntity(entity.id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_entity', entity.id)
    }
    setEntityMenuOpen(false)
    if (isMobile) setOpenMobile(false)
    router.push(entity.route)
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
  const isEdLinkPk = !isAimt && !isEdLinkAu && activeEntity !== 'nsc' && activeEntity !== 'isquare-bpo'

  const currentEntityObj =
    ENTITIES.find((e) => e.id === activeEntity) ||
    (isAimt ? ENTITIES[2] : isEdLinkAu ? ENTITIES[1] : ENTITIES[0])

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/10 bg-[#001E2F] text-slate-100 font-sans select-none"
    >
      {/* 1. Header: Brand / Teams Workspace Switcher (shadcn style) */}
      <SidebarHeader className="p-3 border-b border-white/10 bg-[#001724] relative">
        <div ref={menuRef} className="relative w-full">
          <button
            type="button"
            onClick={() => setEntityMenuOpen((prev) => !prev)}
            className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-[#0E3E5B]/80 text-slate-100 transition-colors text-left group cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#81F5F5]/40"
          >
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-white p-1 shadow-sm shrink-0 border border-white/20">
              {currentEntityObj.logo ? (
                <img
                  src={currentEntityObj.logo}
                  alt={currentEntityObj.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : currentEntityObj.icon ? (
                <currentEntityObj.icon className="size-5 text-[#003D5C]" />
              ) : (
                <Building2 className="size-5 text-[#003D5C]" />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden min-w-0">
              <span className="truncate font-bold text-white tracking-tight font-['Montserrat'] text-[13px]">
                {currentEntityObj.name}
              </span>
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#81F5F5]/90">
                {currentEntityObj.subtitle}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-slate-400 group-data-[collapsible=icon]:hidden shrink-0" />
          </button>

          {/* Teams Dropdown Menu */}
          {entityMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-[#001E2F] border border-slate-700 text-slate-100 shadow-2xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Teams
              </div>
              <div className="space-y-0.5 mt-0.5">
                {ENTITIES.map((entity) => {
                  const isSelected = entity.id === currentEntityObj.id
                  const IconComp = entity.icon || Building2
                  return (
                    <button
                      key={entity.id}
                      type="button"
                      onClick={() => handleSelectEntity(entity)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer group/item ${
                        isSelected
                          ? 'bg-[#0E3E5B] text-white'
                          : 'text-slate-300 hover:bg-[#0E3E5B]/70 hover:text-white'
                      }`}
                    >
                      <div className="size-7 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0 border border-white/20">
                        {entity.logo ? (
                          <img
                            src={entity.logo}
                            alt={entity.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <IconComp className="size-4 text-[#003D5C]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>{entity.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {entity.subtitle}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/10 text-slate-300 group-hover/item:text-white shrink-0">
                        {entity.shortcut}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="h-px bg-white/10 my-1.5" />

              <Link
                href="/portal"
                onClick={() => {
                  setEntityMenuOpen(false)
                  handleNavClick()
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#0E3E5B] hover:text-white transition-colors cursor-pointer"
              >
                <Building2 className="size-4 text-[#81F5F5]" />
                <span>All Portals / Overview</span>
              </Link>
            </div>
          )}
        </div>
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

                          {/* Payslip */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              render={<Link href="/attendance/payslips" onClick={handleNavClick} />}
                              isActive={pathname.startsWith('/attendance/payslips')}
                              className="text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B]/60 data-[active=true]:bg-[#81F5F5] data-[active=true]:text-[#002020] data-[active=true]:font-bold rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <Receipt className="size-3.5 shrink-0" />
                              <span>Payslip</span>
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

      {/* 3. Footer: User Profile & Quick Actions */}
      <SidebarFooter className="p-2.5 border-t border-white/10 bg-[#001724]">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-[#0E3E5B]/80 text-slate-200 hover:text-white transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#81F5F5]/30 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5 data-popup-open:bg-[#0E3E5B] data-popup-open:text-white">
            <div className="size-8 rounded-lg bg-[#0E3E5B] text-[#81F5F5] font-bold text-xs flex items-center justify-center shrink-0 border border-white/10 shadow-xs">
              {initials}
            </div>
            <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden min-w-0">
              <span className="truncate font-semibold text-white">
                {email}
              </span>
              <span className="truncate text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Administrator
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-slate-400 group-data-[collapsible=icon]:hidden shrink-0" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-64 rounded-xl bg-[#001E2F] border border-slate-700 text-slate-100 shadow-2xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95"
          >
            {/* User Profile Header inside Dropdown */}
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5 select-none mb-1">
              <div className="size-8 rounded-lg bg-[#0E3E5B] text-[#81F5F5] font-bold text-xs flex items-center justify-center shrink-0 border border-white/10">
                {initials}
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight min-w-0">
                <span className="truncate font-semibold text-white">
                  {email}
                </span>
                <span className="truncate text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Administrator
                </span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Settings Option (No link for now per request) */}
            <DropdownMenuItem
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-[#0E3E5B] rounded-lg cursor-pointer transition-colors"
            >
              <Settings className="size-4 text-slate-400" />
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            {/* Logout Option */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg cursor-pointer transition-colors"
            >
              <LogOut className="size-4 text-rose-400" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      {/* 4. Rail for resizing / collapsing */}
      <SidebarRail />
    </Sidebar>
  )
}
