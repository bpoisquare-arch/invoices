'use client'

import React from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export default function Header() {
  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-2xs font-sans">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md" />
        <Separator orientation="vertical" className="h-4 hidden sm:block bg-slate-200" />
        <h2 className="font-['Montserrat'] text-sm sm:text-base md:text-lg font-bold text-[#003D5C] tracking-tight truncate max-w-[200px] sm:max-w-none">
          Client Management System
        </h2>
      </div>
    </header>
  )
}
