'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LahoriLoungePayslipForm from '@/components/payslips/lahori-lounge-payslip-form'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function NewLahoriLoungePayslipPage() {
  const router = useRouter()
  const { isViewer, isLoading } = useAuthRole()

  useEffect(() => {
    if (!isLoading && isViewer) {
      router.replace('/lahori-lounge/payslips')
    }
  }, [isViewer, isLoading, router])

  if (isViewer) return null

  return <LahoriLoungePayslipForm />
}

