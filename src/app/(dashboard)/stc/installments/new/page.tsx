'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import STCInstallmentForm from '@/components/installments/stc-installment-form'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function NewSTCInstallmentPage() {
  const router = useRouter()
  const { isViewer, isLoading } = useAuthRole()

  useEffect(() => {
    if (!isLoading && isViewer) {
      router.replace('/stc/installments')
    }
  }, [isViewer, isLoading, router])

  if (isViewer) return null

  return <STCInstallmentForm mode="create" />
}
