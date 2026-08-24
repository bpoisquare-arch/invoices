'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Bell, HelpCircle } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

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
    <header className="h-16 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-2xs font-sans">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md" />
        <Separator orientation="vertical" className="h-4 hidden sm:block bg-slate-200" />
        <h2 className="font-['Montserrat'] text-sm sm:text-base md:text-lg font-bold text-[#003D5C] tracking-tight truncate max-w-[200px] sm:max-w-none">
          Invoice Management System
        </h2>
      </div>

      {/* Right User Bar */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button className="p-2 text-slate-500 hover:text-[#003D5C] transition-colors rounded-lg hover:bg-slate-50">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button className="p-2 text-slate-500 hover:text-[#003D5C] transition-colors rounded-lg hover:bg-slate-50 hidden sm:block">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{email}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Administrator</p>
          </div>
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#13557A] text-white font-bold text-xs flex items-center justify-center border border-slate-200 shadow-xs">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
