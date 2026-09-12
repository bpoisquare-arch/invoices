'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  STCStudentInstallmentSchedule,
  getSTCInstallmentById,
  getSTCFixedInfo,
  STCFixedInfo,
} from '@/lib/services/stc-installment.service'
import STCScheduleWebPreview from '@/components/installments/stc-schedule-web-preview'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Edit, Printer, Loader2 } from 'lucide-react'

export default function STCInstallmentPreviewPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [schedule, setSchedule] = useState<STCStudentInstallmentSchedule | null>(null)
  const [fixedInfo, setFixedInfo] = useState<STCFixedInfo>(getSTCFixedInfo())
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  async function loadScheduleData() {
    if (id) {
      setIsLoading(true)
      try {
        const data = await getSTCInstallmentById(id)
        setSchedule(data)
        setFixedInfo(getSTCFixedInfo())
      } catch (err) {
        console.error('Error loading STC schedule:', err)
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
      const studentNameStr = (schedule.student_name || schedule.student_id || 'STC')
        .trim()
        .replace(/[/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, '-')
      const fileName = `Installment-Schedule-${studentNameStr}.pdf`

      // 1. Primary: Fast Server-Side POST Stream with full schedule payload
      try {
        const response = await fetch(`/api/stc/installments-pdf/${schedule.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule, fixedInfo }),
        })
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
      } catch (postErr) {
        console.warn('POST PDF stream failed, trying GET fallback:', postErr)
      }

      // 2. Secondary: Server-Side GET Stream
      const getResponse = await fetch(`/api/stc/installments-pdf/${schedule.id}`)
      if (getResponse.ok) {
        const blob = await getResponse.blob()
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

      // 3. Fallback: Direct window open
      window.open(`/api/stc/installments-pdf/${schedule.id}`, '_blank')
    } catch (err: any) {
      console.error('PDF download error:', err)
      window.open(`/api/stc/installments-pdf/${schedule.id}`, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#009D9E]" />
        <span className="text-sm font-medium">Loading STC Schedule Preview...</span>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Schedule Not Found</h2>
        <p className="text-xs text-slate-500">The requested schedule does not exist or has been removed.</p>
        <Link href="/stc/installments">
          <Button size="sm" className="bg-[#003D5C] hover:bg-[#002b40] text-white font-bold rounded-xl text-xs">
            Back to Schedules
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 text-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link href="/stc/installments">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold font-['Montserrat'] tracking-tight text-[#003D5C]">
              {schedule.student_name}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              ID: {schedule.student_id} • {schedule.course_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/stc/installments/${schedule.id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="bg-[#003D5C] hover:bg-[#002b40] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1.5" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Web Preview Component */}
      <div className="flex justify-center p-3 sm:p-8 bg-slate-100/80 border border-slate-200/90 rounded-2xl shadow-xs overflow-x-auto">
        <STCScheduleWebPreview schedule={schedule} fixedInfo={fixedInfo} />
      </div>
    </div>
  )
}
