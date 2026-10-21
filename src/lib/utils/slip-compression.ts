import { ReportSlip } from '@/types/report-slip.types'

/**
 * Format bytes into human readable format (e.g., 250 KB, 1.2 MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const formatted = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)
  return `${formatted} ${units[i]}`
}

/**
 * Compress an Image file or blob using HTML5 Canvas.
 * Resizes large dimensions (max 1400px) and applies JPEG compression (quality 0.72).
 * Drops 5MB - 10MB images down to ~80KB - 180KB while keeping text razor sharp!
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1400,
  quality = 0.72
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image for compression.'))
      img.onload = () => {
        let width = img.naturalWidth || img.width
        let height = img.naturalHeight || img.height

        // Calculate proportional scale if exceeds max dimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          // Fallback to original dataUrl if canvas context is unavailable
          const dataUrl = reader.result as string
          return resolve({
            dataUrl,
            originalSize,
            compressedSize: originalSize,
          })
        }

        // High quality smoothing for clear receipt/slip text
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // White background in case of transparent PNG receipts
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        // Approximate byte size of base64
        const head = 'data:image/jpeg;base64,'
        const base64Length = compressedDataUrl.length - head.length
        const compressedSize = Math.round((base64Length * 3) / 4)

        resolve({
          dataUrl: compressedDataUrl,
          originalSize,
          compressedSize,
        })
      }

      img.src = reader.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Process a PDF file into base64 Data URL.
 */
export async function processPdfFile(
  file: File
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size

    // Safety limit: 30MB
    if (originalSize > 30 * 1024 * 1024) {
      return reject(new Error('PDF file size exceeds 30MB limit.'))
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read PDF file.'))
    reader.onload = () => {
      const dataUrl = reader.result as string
      const head = 'data:application/pdf;base64,'
      const base64Length = dataUrl.length - head.length
      const compressedSize = Math.round((base64Length * 3) / 4)

      resolve({
        dataUrl,
        originalSize,
        compressedSize,
      })
    }

    reader.readAsDataURL(file)
  })
}

/**
 * High-level helper: Convert uploaded File (PDF or Image) into a compressed ReportSlip object
 */
export async function createReportSlipFromFile(file: File): Promise<ReportSlip> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name)

  if (!isPdf && !isImage) {
    throw new Error('Unsupported format. Please upload a PDF or Image (JPG, PNG, WEBP).')
  }

  const id = `slip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const now = new Date().toISOString()

  if (isPdf) {
    const { dataUrl, originalSize, compressedSize } = await processPdfFile(file)
    return {
      id,
      name: file.name,
      type: 'pdf',
      mimeType: 'application/pdf',
      originalSize,
      compressedSize,
      data: dataUrl,
      uploadedAt: now,
    }
  } else {
    const { dataUrl, originalSize, compressedSize } = await compressImage(file)
    const baseName = file.name || `Receipt_${Date.now()}.jpg`
    return {
      id,
      name: baseName,
      type: 'image',
      mimeType: 'image/jpeg',
      originalSize,
      compressedSize,
      data: dataUrl,
      uploadedAt: now,
    }
  }
}

/**
 * Helper: Convert pasted image blob from clipboard into a compressed ReportSlip object
 */
export async function createReportSlipFromClipboardBlob(
  blob: Blob,
  fallbackName?: string
): Promise<ReportSlip> {
  const id = `slip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const now = new Date().toISOString()
  const name = fallbackName || `Pasted_Slip_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`

  const { dataUrl, originalSize, compressedSize } = await compressImage(blob)
  return {
    id,
    name,
    type: 'image',
    mimeType: 'image/jpeg',
    originalSize,
    compressedSize,
    data: dataUrl,
    uploadedAt: now,
  }
}
