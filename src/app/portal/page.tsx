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
  logo: string
  route: string
  badgeColor: string
  subtitleColor: string
  isPrimary?: boolean
}

const ENTITIES: EntityPortal[] = [
  {
    id: 'edlink-pk',
    name: 'EdLink Pakistan',
    prefix: 'EDL',
    subtitle: 'Education & Visa Services',
    logo: '/edlink-logo.png',
    route: '/invoices',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    subtitleColor: 'text-[#008080]',
    isPrimary: true,
  },
  {
    id: 'edlink-au',
    name: 'EdLink Australia',
    prefix: 'EDA',
    subtitle: 'Education & Visa Services',
    logo: '/edlink-logo.png',
    route: '/invoices',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    subtitleColor: 'text-[#008080]',
  },
  {
    id: 'aimt',
    name: 'Australian Institute of Management and Technology (AIMT)',
    prefix: 'AIMT',
    subtitle: 'Vocational & Academic College',
    logo: '/aimt-logo.png',
    route: '/installments',
    badgeColor: 'bg-red-50 text-red-800 border-red-200',
    subtitleColor: 'text-[#9B1C1C]',
  },
  {
    id: 'nsc',
    name: 'Neighbourhood Shine Co.',
    prefix: 'NSC',
    subtitle: 'Cleaning & Maintenance Services',
    logo: '/Neighbourhood-Shine.png',
    route: '/invoices?entity=nsc',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    subtitleColor: 'text-[#0284C7]',
  },
  {
    id: 'isquare-bpo',
    name: 'ISquare BPO',
    prefix: 'ISQ',
    subtitle: 'BPO & IT Outsourcing',
    logo: '/isquarebpo.png',
    route: '/invoices?entity=isq',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    subtitleColor: 'text-[#4338CA]',
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Portal Header */}
      <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#003D5C] text-[#81F5F5] flex items-center justify-center font-bold font-['Montserrat'] shadow-xs">
            CRM
          </div>
          <div>
            <h1 className="font-['Montserrat'] text-base font-bold text-[#003D5C] tracking-tight">
              Client Management System
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Title and Intro */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Montserrat']">
            Select Workspace
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose which workspace you wish to manage.
          </p>
        </div>

        {/* 5 Entities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {ENTITIES.map((entity) => {
            return (
              <div
                key={entity.id}
                onClick={() => handleSelectEntity(entity)}
                className={`relative group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden p-6 sm:p-7 min-h-[220px] ${
                  entity.isPrimary ? 'ring-2 ring-teal-500/20' : ''
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-end">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] border border-slate-200 uppercase tracking-wider font-mono">
                    {entity.prefix}
                  </span>
                </div>

                {/* Card Main Content (matching 1st attachment design) */}
                <div className="flex flex-col items-center text-center my-auto py-2">
                  {/* Centered Logo Box */}
                  <div className="h-20 sm:h-24 w-full flex items-center justify-center px-4 mb-2 group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={entity.logo}
                      alt={entity.name}
                      className="max-h-full max-w-[220px] object-contain"
                    />
                  </div>

                  {/* Company Name */}
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-sans leading-snug">
                    {entity.name}
                  </h3>

                  {/* Subtitle in Brand Color */}
                  <p className={`text-sm sm:text-base font-semibold mt-1 ${entity.subtitleColor}`}>
                    {entity.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        Enterprise Management Portal • All Rights Reserved
      </footer>
    </div>
  )
}
