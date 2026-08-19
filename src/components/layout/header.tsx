'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Search, Bell, HelpCircle, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [supabase])

  const email = user?.email || 'admin@isquarebpo.com'
  const initials = email.substring(0, 2).toUpperCase()

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white px-8 flex items-center justify-between shrink-0 shadow-2xs font-sans">
      <div className="flex items-center gap-3">
        <h2 className="hidden md:block font-['Montserrat'] text-lg font-bold text-[#003D5C] tracking-tight">
          Invoice Management System
        </h2>
        <div className="flex items-center gap-1.5 md:hidden">
          <ShieldCheck className="w-5 h-5 text-[#009D9E]" />
          <span className="text-xs font-bold text-[#003D5C]">InvoicePro</span>
        </div>
      </div>

      {/* Right User Bar */}
      <div className="flex items-center space-x-4">
        <button className="p-2 text-slate-500 hover:text-[#003D5C] transition-colors rounded-lg hover:bg-slate-50">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-slate-500 hover:text-[#003D5C] transition-colors rounded-lg hover:bg-slate-50 hidden sm:block">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{email}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Administrator</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-[#13557A] text-white font-bold text-xs flex items-center justify-center border border-slate-200 shadow-xs">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
