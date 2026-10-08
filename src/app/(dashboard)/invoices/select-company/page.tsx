'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SelectCompanyPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('active_entity') || 'edlink-pk'
      if (stored === 'nsc') {
        router.replace('/invoices/new?company=nsc')
      } else if (stored === 'isquare-bpo') {
        router.replace('/invoices/new?company=isq')
      } else if (stored === 'edlink-au') {
        router.replace('/invoices/new?company=edlink')
      } else {
        router.replace('/invoices/new?company=edlink-pk')
      }
    }
  }, [router])

  return (
    <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#003D5C]" />
      <span className="text-sm font-medium">Loading Invoice Template...</span>
    </div>
  )
}
