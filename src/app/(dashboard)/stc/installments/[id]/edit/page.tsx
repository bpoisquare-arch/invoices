'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  STCStudentInstallmentSchedule,
  getSTCInstallmentById,
} from '@/lib/services/stc-installment.service'
import STCInstallmentForm from '@/components/installments/stc-installment-form'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function EditSTCInstallmentPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [schedule, setSchedule] = useState<STCStudentInstallmentSchedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (id) {
        setIsLoading(true)
        try {
          const data = await getSTCInstallmentById(id)
          setSchedule(data)
        } catch (err) {
          console.error('Failed to load STC installment for edit:', err)
        } finally {
          setIsLoading(false)
        }
      }
    }
    load()
  }, [id])

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#00BF8F]" />
        <span className="text-sm font-medium">Loading STC Installment Schedule...</span>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="p-16 text-center text-slate-400 space-y-4">
        <h2 className="text-xl font-bold text-white">STC Schedule Not Found</h2>
        <p className="text-xs text-slate-400">The requested schedule does not exist or has been removed.</p>
        <Link href="/stc/installments">
          <Button size="sm" className="bg-[#00BF8F] text-[#001E2F] font-bold rounded-xl text-xs">
            Back to Schedules
          </Button>
        </Link>
      </div>
    )
  }

  return <STCInstallmentForm mode="edit" existingSchedule={schedule} />
}
