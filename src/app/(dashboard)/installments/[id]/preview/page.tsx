'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  StudentInstallmentSchedule,
  getInstallmentById,
  getAimtFixedInfo,
  AIMTFixedInfo,
} from '@/lib/services/installment.service'
import AimtScheduleWebPreview from '@/components/installments/aimt-schedule-web-preview'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Edit, Printer, Loader2 } from 'lucide-react'

import { pdf } from '@react-pdf/renderer'
import AimtSchedulePDFTemplate from '@/components/pdf/aimt-schedule-pdf-template'

export default function InstallmentPreviewPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [schedule, setSchedule] = useState<StudentInstallmentSchedule | null>(null)
  const [fixedInfo, setFixedInfo] = useState<AIMTFixedInfo>(getAimtFixedInfo())
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  async function loadScheduleData() {
    if (id) {
      setIsLoading(true)
      try {
        const data = await getInstallmentById(id)
        setSchedule(data)
        setFixedInfo(getAimtFixedInfo())
      } catch (err) {
        console.error('Error loading schedule:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    loadScheduleData()
  }, [id])

  async function handleDownloadPDF() {
    if (!schedule) return
    try {
      setIsDownloading(true)
      const studentNameStr = schedule.student_name
        ? schedule.student_name.trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '-')
        : (schedule.student_id || 'AIMT')
      const fileName = `Installment-Schedule-${studentNameStr}.pdf`

      // 1. Try server-side streaming PDF route first
      try {
        const response = await fetch(`/api/installments-pdf/${schedule.id}`)
        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          return
        }
      } catch (serverErr) {
        console.warn('Server PDF streaming failed, trying client-side renderer:', serverErr)
      }

      // 2. Client-side @react-pdf/renderer fallback
      const blob = await pdf(<AimtSchedulePDFTemplate schedule={schedule} fixedInfo={fixedInfo} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('PDF generation failed, opening direct link:', err)
      window.open(`/api/installments-pdf/${schedule.id}`, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#003D5C]" />
        <span>Loading Schedule Preview...</span>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Schedule Not Found</h2>
        <Button onClick={() => router.push('/installments')}>Back to Installments</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/installments')}
            className="gap-2 text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Installments
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Schedule Preview: <span className="font-mono text-blue-700">{schedule.student_id}</span>
            </h1>
            <p className="text-xs text-slate-500">
              {schedule.student_name} — {schedule.course_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/installments/${schedule.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2 text-slate-700">
              <Edit className="w-4 h-4" />
              Edit Schedule
            </Button>
          </Link>

          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            size="sm"
            className="bg-[#009D9E] hover:bg-[#007A7A] text-white font-bold gap-2 shadow-xs cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Web Preview Sheet Container */}
      <div className="bg-slate-200/80 p-4 sm:p-8 rounded-xl border border-slate-300 shadow-inner flex justify-center overflow-x-auto">
        <AimtScheduleWebPreview schedule={schedule} fixedInfo={fixedInfo} />
      </div>
    </div>
  )
}
