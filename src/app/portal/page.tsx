'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  Building2,
  ArrowRight,
  Sparkles,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'

interface EntityPortal {
  id: string
  name: string
  prefix: string
  subtitle: string
  logo: string
  route: string
  tag: string
  badgeColor?: string
  subtitleColor?: string
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
    tag: 'Education & Visa (PK)',
    isPrimary: true,
  },
  {
    id: 'edlink-au',
    name: 'EdLink Australia',
    prefix: 'EDA',
    subtitle: 'Education & Visa Services',
    logo: '/edlink-logo.png',
    route: '/invoices',
    tag: 'Education & Visa (AU)',
  },
  {
    id: 'aimt',
    name: 'Australian Institute of Management and Technology (AIMT)',
    prefix: 'AIMT',
    subtitle: 'Vocational & Academic College',
    logo: '/aimt-logo.png',
    route: '/installments',
    tag: 'Higher Education & VET',
  },
  {
    id: 'nsc',
    name: 'Neighbourhood Shine Co.',
    prefix: 'NSC',
    subtitle: 'Cleaning & Maintenance Services',
    logo: '/Neighbourhood-Shine.png',
    route: '/invoices?entity=nsc',
    tag: 'Facility & Maintenance',
  },
  {
    id: 'isquare-bpo',
    name: 'ISquare BPO',
    prefix: 'ISQ',
    subtitle: 'BPO & IT Outsourcing',
    logo: '/isquarebpo.png',
    route: '/invoices?entity=isq',
    tag: 'Business Process Outsourcing',
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
    <div className="min-h-screen bg-[#F0FDF9] text-[#0F1F18] font-sans flex flex-col justify-between selection:bg-[#06D6A0]/20 selection:text-[#002D27]">
      {/* Top Portal Header */}
      <header className="h-20 border-b border-[#002D27]/10 bg-white/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-white p-1.5 flex items-center justify-center border border-[#002D27]/15 shadow-sm shrink-0 overflow-hidden group hover:border-[#00BF8F] transition-all">
            <img
              src="/isquarebpo.png"
              alt="iSquare BPO"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Montserrat'] text-base sm:text-lg font-extrabold text-[#002D27] tracking-tight">
                Client Management System
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00BF8F]/10 text-[#002D27] border border-[#00BF8F]/25">
                ISquare BPO
              </span>
            </div>
            <p className="text-xs text-[#5C7B73] font-medium">
              Multi-Entity Business System
            </p>
          </div>
        </div>

        {/* User profile & logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-[#0F1F18]">{email}</span>
            <span className="text-[10px] font-bold text-[#00BF8F] uppercase tracking-wider flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
              Administrator
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#002D27] text-[#06D6A0] text-xs font-extrabold flex items-center justify-center border border-[#002D27]/20 shadow-xs">
            {initials}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-9 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4 mr-1 sm:mr-0" />
            <span className="sm:hidden">Logout</span>
          </Button>
        </div>
      </header>

      {/* Main Portal Body */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Title and Intro */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#002D27] to-[#1A2F26] text-[#06D6A0] shadow-lg shadow-[#002D27]/15 mb-1 border border-[#002D27]/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#002D27]/5 border border-[#002D27]/10 text-xs font-bold text-[#002D27] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00BF8F]" />
              Enterprise Workspaces
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#002D27] tracking-tight font-['Montserrat']">
              Select Workspace
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#5C7B73] font-medium leading-relaxed">
            Choose which client workspace you wish to access and manage.
          </p>
        </div>

        {/* 5 Entities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {ENTITIES.map((entity) => {
            return (
              <div
                key={entity.id}
                onClick={() => handleSelectEntity(entity)}
                className={`group relative bg-gradient-to-b from-[#002D27] via-[#0F1F18] to-[#0A1611] rounded-2xl border border-white/10 shadow-lg shadow-[#002D27]/20 hover:shadow-2xl hover:shadow-[#00BF8F]/20 hover:border-[#00BF8F] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden p-6 sm:p-7 min-h-[250px] ${
                  entity.isPrimary ? 'ring-2 ring-[#00BF8F]/40 border-[#00BF8F]/60' : ''
                }`}
              >
                {/* Top Corner Radial Glow on Hover */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-[#00BF8F]/25 via-[#06D6A0]/10 to-transparent rounded-bl-full pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Top Meta Bar */}
                <div className="flex items-center justify-between relative z-10">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#1A2F26] text-[#06D6A0] font-extrabold text-[11px] border border-[#06D6A0]/30 uppercase tracking-wider font-mono shadow-xs">
                    {entity.prefix}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/10 text-slate-300 group-hover:bg-[#00BF8F] group-hover:text-[#0F1F18] flex items-center justify-center transition-all duration-300 shadow-sm">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform font-bold" />
                  </div>
                </div>

                {/* Card Main Content */}
                <div className="flex flex-col items-center text-center my-auto py-3 relative z-10">
                  {/* Crisp White Logo Box for Optimal Visibility */}
                  <div className="h-20 sm:h-22 w-full max-w-[240px] rounded-xl bg-white p-2.5 flex items-center justify-center mb-3.5 shadow-md border border-white/20 group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={entity.logo}
                      alt={entity.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Company Name */}
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight font-sans leading-snug group-hover:text-[#81F5F5] transition-colors">
                    {entity.name}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm font-semibold mt-1 text-[#06D6A0] group-hover:text-[#25D366] transition-colors">
                    {entity.subtitle}
                  </p>
                </div>

                {/* Bottom Tag & Enter Action */}
                <div className="pt-3.5 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
                  <span className="text-[11px] font-medium text-slate-400 truncate max-w-[160px]">
                    {entity.tag}
                  </span>
                  <span className="text-[11px] font-bold text-[#06D6A0] group-hover:text-[#81F5F5] flex items-center gap-1 transition-colors">
                    Open Workspace <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs font-medium text-[#5C7B73] border-t border-[#002D27]/10 bg-white/70 backdrop-blur-xs">
        <div className="flex items-center justify-center gap-2">
          <span>Client Management System by <strong className="text-[#002D27] font-bold">ISquareBPO</strong></span>
          <span>•</span>
          <span>All Rights Reserved</span>
        </div>
      </footer>
    </div>
  )
}
