export interface ReportSlip {
  id: string
  name: string
  type: 'pdf' | 'image'
  mimeType: string
  originalSize: number
  compressedSize: number
  fileSize?: number
  data: string // Data URL: "data:image/jpeg;base64,..." or "data:application/pdf;base64,..."
  uploadedAt: string
}
