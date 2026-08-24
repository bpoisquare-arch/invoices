'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Briefcase,
  Layers,
  LogOut,
  Settings,
  ShieldCheck,
  Headphones,
  CheckCircle2,
} from 'lucide-react'

interface EntityPortal {
  id: string
  name: string
  prefix: string
  subtitle: string
  description: string
  logo?: string
  icon?: any
  route: string
  badgeColor: string
  isPrimary?: boolean
}

const ENTITIES: EntityPortal[] = [
  {
    id: 'edlink-pk',
    name: 'EdLink Pakistan',
    prefix: 'EDL',
    subtitle: 'Education & Visa Services',
    description: "Anonymous / Custom invoicing & complete staff payroll management",
    logo: '/edlink-logo.png',
    route: '/invoices',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    isPrimary: true,
  },
  {
    id: 'edlink-au',
    name: 'EdLink Australia',
    prefix: 'EDA',
    subtitle: 'Education & Visa Services',
    description: "Official EdLink Australia billing entity & client invoicing",
    logo: '/edlink-logo.png',
    route: '/invoices',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    id: 'aimt',
    name: 'Australian Institute of Management and Technology (AIMT)',
    prefix: 'AIMT',
    subtitle: 'Vocational & Academic College',
    description: 'Student installment schedules, course fees & PDF generation',
    logo: '/aimt-logo.png',
    route: '/installments',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  {
    id: 'nsc',
    name: 'Neighbourhood Shine Co.',
    prefix: 'NSC',
    subtitle: 'Cleaning & Maintenance Services',
    description: 'Commercial & residential service billing operations',
    icon: Sparkles,
    route: '/invoices?entity=nsc',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'isquare-bpo',
    name: 'ISquare BPO',
    prefix: 'ISQ',
    subtitle: 'BPO & IT Outsourcing',
    description: 'Enterprise offshore business process & client invoicing',
    icon: Headphones,
    route: '/invoices?entity=isq',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
  },
]

export default function EntityPortalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [supabase])

  const email = user?.email || 'admin@isquarebpo.com'
  const initials = email.substring(0, 2).toUpperCase()

  async function handleLogout() {
    document.cookie = 'dev-auth-session=; path=/; max-age=0'
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSelectEntity(entity: EntityPortal) {
    setSelectedEntity(entity.id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_entity', entity.id)
    }
    router.push(entity.route)
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Portal Header */}
      <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#003D5C] text-[#81F5F5] flex items-center justify-center font-bold font-['Montserrat'] shadow-xs">
            EP
          </div>
          <div>
            <h1 className="font-['Montserrat'] text-base font-bold text-[#003D5C] tracking-tight">
              Enterprise Management Portal
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Multi-Entity Business System
            </p>
          </div>
        </div>

        {/* User profile & logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900">{email}</span>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
              Administrator
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#0E3E5B] text-[#81F5F5] text-xs font-bold flex items-center justify-center border border-slate-200 shadow-2xs">
            {initials}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Portal Body */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Title and Intro */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Montserrat']">
            Select Company
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose which company or organization workspace you wish to manage.
          </p>
        </div>

        {/* 5 Entities Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {ENTITIES.map((entity) => {
            const IconComp = entity.icon
            return (
              <Card
                key={entity.id}
                onClick={() => handleSelectEntity(entity)}
                className={`shadow-xs border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between rounded-xl bg-white overflow-hidden ${
                  entity.isPrimary ? 'ring-1 ring-blue-500/30' : ''
                }`}
              >
                <CardHeader className="p-5 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    {/* Logo / Icon Container */}
                    <div className="h-12 w-36 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-2 overflow-hidden group-hover:bg-blue-50/50 group-hover:border-blue-200 transition-colors">
                      {entity.logo ? (
                        <img
                          src={entity.logo}
                          alt={entity.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : IconComp ? (
                        <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                          <IconComp className="w-5 h-5 text-blue-600" />
                          <span className="truncate">{entity.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Prefix Badge */}
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 uppercase tracking-wider font-mono">
                      {entity.prefix}
                    </span>
                  </div>

                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {entity.name}
                    </CardTitle>
                    <p className="text-[11px] font-semibold text-blue-600/90 mt-0.5">
                      {entity.subtitle}
                    </p>
                    <CardDescription className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {entity.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0">
                  <Button className="w-full bg-slate-100 hover:bg-blue-600 text-slate-800 group-hover:text-white justify-between text-xs font-semibold h-9 transition-colors">
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        Enterprise Management Portal • All Rights Reserved
      </footer>
    </div>
  )
}
