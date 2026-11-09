'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  LahoriLoungePayslip,
  lahoriLoungePayslipService,
} from '@/lib/services/lahori-lounge-payslip.service'
import LahoriLoungePayslipForm from '@/components/payslips/lahori-lounge-payslip-form'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

interface EditLahoriLoungePayslipPageProps {
  params: Promise<{ id: string }>
}

export default function EditLahoriLoungePayslipPage({
  params,
}: EditLahoriLoungePayslipPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { isViewer, isLoading: roleLoading } = useAuthRole()
  const [payslip, setPayslip] = useState<LahoriLoungePayslip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roleLoading && isViewer) {
      router.replace('/lahori-lounge/payslips')
      return
    }
  }, [isViewer, roleLoading, router])

  useEffect(() => {
    async function fetchPayslip() {
      if (!resolvedParams.id) return
      setLoading(true)
      try {
        const data = await lahoriLoungePayslipService.getById(resolvedParams.id)
        if (data) {
          setPayslip(data)
        } else {
          alert('Payslip not found.')
          router.push('/lahori-lounge/payslips')
        }
      } catch (err) {
        console.error('Error loading payslip for edit:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPayslip()
  }, [resolvedParams.id, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 animate-spin text-[#81F5F5]" />
        <span className="text-sm text-slate-300">Loading payslip details...</span>
      </div>
    )
  }

  if (!payslip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-slate-300">Payslip record could not be found.</p>
        <Link
          href="/lahori-lounge/payslips"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="size-4" />
          <span>Back to All Payslips</span>
        </Link>
      </div>
    )
  }

  return <LahoriLoungePayslipForm initialData={payslip} isEditing={true} />
}

