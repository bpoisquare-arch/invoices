'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { STCPayslip, stcPayslipService } from '@/lib/services/stc-payslip.service'
import STCPayslipForm from '@/components/payslips/stc-payslip-form'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuthRole } from '@/lib/hooks/use-auth-role'

interface EditSTCPayslipPageProps {
  params: Promise<{ id: string }>
}

export default function EditSTCPayslipPage({ params }: EditSTCPayslipPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { isViewer, isLoading: roleLoading } = useAuthRole()
  const [payslip, setPayslip] = useState<STCPayslip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!roleLoading && isViewer) {
      router.replace('/stc/payslips')
      return
    }
  }, [isViewer, roleLoading, router])

  useEffect(() => {
    async function fetchPayslip() {
      if (!resolvedParams.id) return
      setLoading(true)
      try {
        const data = await stcPayslipService.getById(resolvedParams.id)
        if (data) {
          setPayslip(data)
        } else {
          alert('STC Payslip not found.')
          router.push('/stc/payslips')
        }
      } catch (err) {
        console.error('Error loading STC payslip for edit:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPayslip()
  }, [resolvedParams.id, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 animate-spin text-[#00BF8F]" />
        <span className="text-sm text-slate-300">Loading STC payslip details...</span>
      </div>
    )
  }

  if (!payslip) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-300">STC Payslip not found.</p>
        <Link
          href="/stc/payslips"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#00BF8F]/20 text-[#00BF8F] rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Back to All Payslips</span>
        </Link>
      </div>
    )
  }

  return <STCPayslipForm initialData={payslip} isEditing={true} />
}
