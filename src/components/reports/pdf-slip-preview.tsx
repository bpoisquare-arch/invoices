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
  RefreshCw,
  RotateCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfSlipPreviewProps {
  dataUrl: string
  fileName?: string
  className?: string
  onOpenNewTab?: () => void
  onDownload?: () => void
}

// Global script loader for local self-hosted PDF.js
function loadPdfJsScript(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib)

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('pdfjs-local-script') as HTMLScriptElement | null
    if (existing) {
      if ((window as any).pdfjsLib) {
        return resolve((window as any).pdfjsLib)
      }
      existing.addEventListener('load', () => {
        const lib = (window as any).pdfjsLib
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'
          resolve(lib)
        } else {
          reject(new Error('PDF.js not found'))
        }
      })
      existing.addEventListener('error', () => reject(new Error('Failed to load PDF.js script')))
      return
    }

    const script = document.createElement('script')
    script.id = 'pdfjs-local-script'
    script.src = '/pdfjs/pdf.min.js'
    script.async = true
    script.onload = () => {
      const lib = (window as any).pdfjsLib
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'
        resolve(lib)
      } else {
        reject(new Error('PDF.js not found after load'))
      }
    }
    script.onerror = () => {
      // Fallback to CDN if local path fails
      const cdnScript = document.createElement('script')
      cdnScript.id = 'pdfjs-cdn-fallback'
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      cdnScript.onload = () => {
        const lib = (window as any).pdfjsLib
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          resolve(lib)
        } else {
          reject(new Error('PDF.js not found via CDN'))
        }
      }
      cdnScript.onerror = () => reject(new Error('Failed to load PDF.js from all sources'))
      document.head.appendChild(cdnScript)
    }
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
  const renderTaskRef = useRef<any>(null)

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.25)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [canvasReady, setCanvasReady] = useState<boolean>(false)

  // 1. Create a Same-Origin Blob URL from dataUrl
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

  // 2. Load PDF with self-hosted PDF.js
  const loadPdfDocument = useCallback(async () => {
    setIsLoading(true)
    setRenderError(null)
    setCanvasReady(false)
    setCurrentPage(1)
    setRotation(0)

    if (!dataUrl) {
      setIsLoading(false)
      return
    }

    try {
      const pdfjsLib = await loadPdfJsScript()

      const parts = dataUrl.split(',')
      const base64 = parts[1] || ''
      const raw = atob(base64)
      const rawLength = raw.length
      const array = new Uint8Array(new ArrayBuffer(rawLength))
      for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i)
      }

      const loadingTask = pdfjsLib.getDocument({
        data: array,
        cMapPacked: true,
      })
      const doc = await loadingTask.promise

      setPdfDoc(doc)
      setTotalPages(doc.numPages || 1)
      setIsLoading(false)
    } catch (err: any) {
      console.warn('PDF.js renderer note:', err)
      setRenderError(err?.message || 'Could not parse PDF using Canvas.')
      setIsLoading(false)
    }
  }, [dataUrl])

  useEffect(() => {
    loadPdfDocument()
  }, [loadPdfDocument])

  // 3. Render current page on canvas cleanly without residual transforms
  const renderPage = useCallback(
    async (doc: any, pageNum: number, currentScale: number, currentRotation: number) => {
      if (!doc || !canvasRef.current) return

      // Cancel any ongoing render task before starting a new one
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {}
        renderTaskRef.current = null
      }

      try {
        const page = await doc.getPage(pageNum)
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return

        // Effective rotation combining page intrinsic rotation and manual user rotation
        const effectiveRotation = ((page.rotate || 0) + currentRotation) % 360

        const viewport = page.getViewport({
          scale: currentScale,
          rotation: effectiveRotation,
        })

        // CRITICAL: Reset 2D context affine transform to identity before resizing canvas
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        // Reset transform again after canvas resize (ensures clean coordinate space)
        context.setTransform(1, 0, 0, 1, 0, 0)

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        const renderTask = page.render(renderContext)
        renderTaskRef.current = renderTask

        await renderTask.promise
        renderTaskRef.current = null
        setCanvasReady(true)
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          // Expected when a re-render cancels the active task, safe to ignore
          return
        }
        console.error('Error rendering PDF page to canvas:', err)
        setCanvasReady(false)
      }
    },
    []
  )

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage, scale, rotation)
    }
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {}
        renderTaskRef.current = null
      }
    }
  }, [pdfDoc, currentPage, scale, rotation, renderPage])

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 2.5))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.75))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1))
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages))

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs ${className}`}
    >
      {/* Top Floating Control Bar */}
      {!isLoading && !renderError && pdfDoc && (
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white text-xs select-none z-10 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-[11px] text-[#00BF8F] tracking-wide uppercase flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#00BF8F] animate-pulse" />
              PDF PREVIEW
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-0.5 hover:text-[#00BF8F] disabled:opacity-30 cursor-pointer transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="p-0.5 hover:text-[#00BF8F] disabled:opacity-30 cursor-pointer transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Rotate Button */}
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-200 hover:text-[#00BF8F] transition-all cursor-pointer font-bold text-[11px]"
              title="Rotate PDF 90 degrees"
            >
              <RotateCw className="size-3.5" />
              <span>Rotate{rotation !== 0 ? ` ${rotation}°` : ''}</span>
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 hover:text-[#00BF8F] text-slate-300 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="text-[10.5px] font-mono font-bold w-10 text-center text-slate-200">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 hover:text-[#00BF8F] text-slate-300 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div className="relative w-full flex-1 flex flex-col items-center justify-start min-h-[350px] sm:min-h-[480px] max-h-[540px] overflow-auto p-3 sm:p-4 bg-slate-200/50">
        {isLoading && (
          <div className="flex flex-col items-center justify-center my-auto py-12 space-y-2.5 text-slate-500">
            <Loader2 className="size-9 animate-spin text-emerald-600" />
            <p className="text-xs font-bold text-slate-800">Rendering PDF document preview...</p>
            <span className="text-[11px] text-slate-400">Loading vector pages from local engine</span>
          </div>
        )}

        {/* 1. Canvas Vector Renderer (Primary 100% reliable view) */}
        <canvas
          ref={canvasRef}
          className={`max-w-full rounded-xl shadow-md border border-slate-300 bg-white mx-auto transition-all ${
            isLoading || renderError || !canvasReady ? 'hidden' : 'block'
          }`}
        />

        {/* 2. Fallback to Same-Origin Blob Iframe/Object */}
        {!isLoading && (renderError || !pdfDoc) && (
          <div className="w-full flex flex-col items-center justify-center my-auto p-6 text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto">
            <div className="size-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <FileText className="size-8" />
            </div>

            <div>
              <p className="text-sm font-extrabold text-slate-900">{fileName}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Document is ready. Click below to inspect in high resolution or download the original file.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1 flex-wrap justify-center">
              {onOpenNewTab && (
                <Button
                  type="button"
                  onClick={onOpenNewTab}
                  className="bg-[#00BF8F] hover:bg-[#00A87D] text-white text-xs font-bold h-9 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Open PDF in New Tab</span>
                </Button>
              )}

              {onDownload && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDownload}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold h-9 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Download className="size-3.5 text-slate-600" />
                  <span>Download</span>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={loadPdfDocument}
                className="text-slate-500 hover:text-slate-800 text-xs font-semibold h-9 px-3 rounded-xl cursor-pointer flex items-center gap-1"
                title="Retry rendering"
              >
                <RefreshCw className="size-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
