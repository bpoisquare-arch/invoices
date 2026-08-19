import React from 'react'
import EdLinkWebPreview from '@/components/templates-preview/edlink-web-preview'
import DefaultWebPreview from '@/components/templates-preview/default-web-preview'
import EdLinkPDFTemplate from '@/components/pdf/edlink-pdf-template'
import DefaultPDFTemplate from '@/components/pdf/default-pdf-template'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'

export function renderInvoiceWebPreview(invoice: Partial<InvoiceWithDetails>, snapshot?: TemplateSnapshot) {
  const layout = snapshot?.layout_type || invoice.templates?.layout_type || 'edlink_v1'

  switch (layout) {
    case 'edlink_v1':
      return <EdLinkWebPreview invoice={invoice} snapshot={snapshot} />
    default:
      return <DefaultWebPreview invoice={invoice} snapshot={snapshot} />
  }
}

export function renderInvoicePDFDocument(
  invoice: Partial<InvoiceWithDetails>,
  snapshot?: TemplateSnapshot,
  resolvedLogoUrl?: string
) {
  const layout = snapshot?.layout_type || invoice.templates?.layout_type || 'edlink_v1'

  switch (layout) {
    case 'edlink_v1':
      return <EdLinkPDFTemplate invoice={invoice} snapshot={snapshot} resolvedLogoUrl={resolvedLogoUrl} />
    default:
      return <DefaultPDFTemplate invoice={invoice} snapshot={snapshot} />
  }
}
