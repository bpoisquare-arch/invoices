'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import InstallmentForm from '@/components/installments/installment-form'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

export default function NewInstallmentPage() {
  const router = useRouter()
  const { isViewer, isLoading } = useAuthRole()

  useEffect(() => {
    if (!isLoading && isViewer) {
      router.replace('/installments')
    }
  }, [isViewer, isLoading, router])

  if (isViewer) return null

  return <InstallmentForm mode="create" />
}
