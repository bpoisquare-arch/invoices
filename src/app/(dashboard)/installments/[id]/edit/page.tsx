'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  StudentInstallmentSchedule,
  getInstallmentById,
} from '@/lib/services/installment.service'
import InstallmentForm from '@/components/installments/installment-form'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function EditInstallmentPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { isViewer, isLoading: roleLoading } = useAuthRole()

  const [schedule, setSchedule] = useState<StudentInstallmentSchedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!roleLoading && isViewer) {
      router.replace('/installments')
      return
    }
  }, [isViewer, roleLoading, router])

  useEffect(() => {
    async function load() {
      if (id) {
        setIsLoading(true)
        try {
          const data = await getInstallmentById(id)
          setSchedule(data)
        } catch (err) {
          console.error('Failed to load installment for edit:', err)
        } finally {
          setIsLoading(false)
        }
      }
    }
    load()
  }, [id])

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#003D5C]" />
        <span>Loading Installment Schedule...</span>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Schedule Not Found</h2>
      </div>
    )
  }

  return <InstallmentForm mode="edit" existingSchedule={schedule} />
}
