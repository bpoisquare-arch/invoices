'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import STCPayslipForm from '@/components/payslips/stc-payslip-form'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function NewSTCPayslipPage() {
  const router = useRouter()
  const { isViewer, isLoading } = useAuthRole()

  useEffect(() => {
    if (!isLoading && isViewer) {
      router.replace('/stc/payslips')
    }
  }, [isViewer, isLoading, router])

  if (isViewer) return null

  return <STCPayslipForm />
}
