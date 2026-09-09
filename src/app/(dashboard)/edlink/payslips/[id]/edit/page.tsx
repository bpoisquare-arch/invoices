'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { EdlinkPayslip, edlinkPayslipService } from '@/lib/services/edlink-payslip.service'
import EdLinkPayslipForm from '@/components/payslips/edlink-payslip-form'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface EditEdLinkPayslipPageProps {
  params: Promise<{ id: string }>
}

export default function EditEdLinkPayslipPage({ params }: EditEdLinkPayslipPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [payslip, setPayslip] = useState<EdlinkPayslip | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPayslip() {
      if (!resolvedParams.id) return
      setLoading(true)
      try {
        const data = await edlinkPayslipService.getById(resolvedParams.id)
        if (data) {
          setPayslip(data)
        } else {
          alert('Payslip not found.')
          router.push('/edlink/payslips')
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
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-300">Payslip not found.</p>
        <Link
          href="/edlink/payslips"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0E3E5B] text-[#81F5F5] rounded-xl text-sm font-semibold"
        >
          <ArrowLeft className="size-4" />
          <span>Back to All Payslips</span>
        </Link>
      </div>
    )
  }

  return <EdLinkPayslipForm initialData={payslip} isEditing={true} />
}
