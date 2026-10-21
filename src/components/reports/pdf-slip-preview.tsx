'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  AlertCircle,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfSlipPreviewProps {
  dataUrl: string
  fileName?: string
  className?: string
  onOpenNewTab?: () => void
  onDownload?: () => void
}

// Global script loader for PDF.js CDN
function loadPdfJsScript(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib)

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('pdfjs-cdn-script') as HTMLScriptElement | null
    if (existing) {
      if ((window as any).pdfjsLib) {
        return resolve((window as any).pdfjsLib)
      }
      existing.addEventListener('load', () => {
        const lib = (window as any).pdfjsLib
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          resolve(lib)
        } else {
          reject(new Error('PDF.js not found'))
        }
      })
      existing.addEventListener('error', () => reject(new Error('Failed to load PDF.js script')))
      return
    }

    const script = document.createElement('script')
    script.id = 'pdfjs-cdn-script'
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      const lib = (window as any).pdfjsLib
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(lib)
      } else {
        reject(new Error('PDF.js not found after load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js script'))
    document.head.appendChild(script)
  })
}

export default function PdfSlipPreview({
  dataUrl,
  fileName = 'document.pdf',
  className = '',
  onOpenNewTab,
  onDownload,
}: PdfSlipPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.25)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [canvasReady, setCanvasReady] = useState<boolean>(false)

  // 1. Create a Same-Origin Blob URL from dataUrl (resolves Chrome data: URL blocking)
  useEffect(() => {
    if (!dataUrl) return
    try {
      const parts = dataUrl.split(',')
      const base64Data = parts[1] || ''
      const bstr = atob(base64Data)
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      const blob = new Blob([u8arr], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      console.error('Blob URL creation error:', e)
      setBlobUrl(null)
    }
  }, [dataUrl])

  // 2. Load PDF with PDF.js
  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)
    setRenderError(null)
    setCanvasReady(false)
    setCurrentPage(1)

    if (!dataUrl) {
      setIsLoading(false)
      return
    }

    const loadDoc = async () => {
      try {
        const pdfjsLib = await loadPdfJsScript()
        if (isCancelled) return

        const parts = dataUrl.split(',')
        const base64 = parts[1] || ''
        const raw = atob(base64)
        const rawLength = raw.length
        const array = new Uint8Array(new ArrayBuffer(rawLength))
        for (let i = 0; i < rawLength; i++) {
          array[i] = raw.charCodeAt(i)
        }

        const loadingTask = pdfjsLib.getDocument({ data: array })
        const doc = await loadingTask.promise
        if (isCancelled) return

        setPdfDoc(doc)
        setTotalPages(doc.numPages || 1)
        setIsLoading(false)
      } catch (err: any) {
        console.warn('PDF.js canvas renderer fallback to native embed:', err)
        if (!isCancelled) {
          setRenderError(err?.message || 'Could not parse PDF using Canvas.')
          setIsLoading(false)
        }
      }
    }

    loadDoc()

    return () => {
      isCancelled = true
    }
  }, [dataUrl])

  // 3. Render current page on canvas
  const renderPage = useCallback(
    async (doc: any, pageNum: number, currentScale: number) => {
      if (!doc || !canvasRef.current) return
      try {
        const page = await doc.getPage(pageNum)
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return

        const viewport = page.getViewport({ scale: currentScale })
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
        setCanvasReady(true)
      } catch (err: any) {
        console.error('Error rendering PDF page to canvas:', err)
        setCanvasReady(false)
      }
    },
    []
  )

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage, scale)
    }
  }, [pdfDoc, currentPage, scale, renderPage])

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 2.5))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.75))
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1))
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages))

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 ${className}`}
    >
      {/* Top Floating Control Bar when Canvas is active */}
      {!isLoading && !renderError && pdfDoc && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white text-xs select-none z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[11px] text-emerald-400">PDF PREVIEW</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-slate-700/80 px-2 py-0.5 rounded-md">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-0.5 hover:text-emerald-300 disabled:opacity-30 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="text-[11px] font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-0.5 hover:text-emerald-300 disabled:opacity-30 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="text-[10px] font-mono w-10 text-center text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div className="relative w-full flex-1 flex items-center justify-center min-h-[340px] sm:min-h-[480px] max-h-[560px] overflow-auto p-3 sm:p-4 bg-slate-200/60">
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-2.5 py-12 text-slate-500">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <p className="text-xs font-bold text-slate-700">Loading PDF document preview...</p>
            <span className="text-[11px] text-slate-400">Rendering high-resolution vector pages</span>
          </div>
        )}

        {/* 1. Canvas Vector Renderer (100% Reliable, never blocked by Chrome) */}
        <canvas
          ref={canvasRef}
          className={`max-w-full rounded-xl shadow-lg border border-slate-300 bg-white transition-opacity duration-200 ${
            isLoading || renderError || !canvasReady ? 'hidden' : 'block'
          }`}
        />

        {/* 2. Fallback to Same-Origin Blob Object/Embed if PDF.js is unavailable */}
        {!isLoading && (renderError || !pdfDoc) && blobUrl && (
          <object
            data={`${blobUrl}#toolbar=0&navpanes=0`}
            type="application/pdf"
            className="w-full h-[400px] sm:h-[500px] bg-white rounded-xl shadow-xs border border-slate-200"
          >
            <embed
              src={`${blobUrl}#toolbar=0&navpanes=0`}
              type="application/pdf"
              className="w-full h-[400px] sm:h-[500px] rounded-xl"
            />
            {/* Fallback inside object if browser plugins are disabled */}
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-white rounded-xl">
              <div className="size-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                <FileText className="size-7" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">{fileName}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  This PDF is ready. Click below to inspect or download the complete original document.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                {onOpenNewTab && (
                  <Button
                    type="button"
                    onClick={onOpenNewTab}
                    className="bg-[#00BF8F] hover:bg-[#00A87D] text-white text-xs font-bold h-9 px-4 rounded-xl cursor-pointer"
                  >
                    <ExternalLink className="size-3.5 mr-1.5" />
                    Open PDF in New Tab
                  </Button>
                )}
                {onDownload && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onDownload}
                    className="border-slate-300 text-slate-700 text-xs font-bold h-9 px-4 rounded-xl cursor-pointer"
                  >
                    <Download className="size-3.5 mr-1.5" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          </object>
        )}
      </div>
    </div>
  )
}
