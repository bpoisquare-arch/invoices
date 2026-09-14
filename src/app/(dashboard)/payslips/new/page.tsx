'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AIMTPayslipForm from '@/components/payslips/aimt-payslip-form'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function NewPayslipPage() {
  const router = useRouter()
  const { isViewer, isLoading } = useAuthRole()

  useEffect(() => {
    if (!isLoading && isViewer) {
      router.replace('/payslips')
    }
  }, [isViewer, isLoading, router])

  if (isViewer) return null

  return <AIMTPayslipForm />
}
