'use client'

import React from 'react'
import { InvoiceWithDetails, TemplateSnapshot } from '@/types/database.types'

interface EdLinkWebPreviewProps {
  invoice: Partial<InvoiceWithDetails>
  snapshot?: TemplateSnapshot
}

export default function EdLinkWebPreview({ invoice, snapshot }: EdLinkWebPreviewProps) {
  const companyName = snapshot?.company_name || invoice.companies?.name || 'Company Name'
  const isEdlinkAu =
    invoice.entity === 'edlink-au' ||
    companyName.toLowerCase().includes('australia') ||
    invoice.companies?.prefix === 'EDA'

  const address = snapshot?.address !== undefined
    ? snapshot.address
    : (invoice.templates?.address || (isEdlinkAu ? 'Suit 3, Level 4/20 Collins Street, Melbourne 3000' : ''))
  const email = snapshot?.email !== undefined
    ? snapshot.email
    : (invoice.templates?.email || (isEdlinkAu ? 'finance@edlink.com.au' : ''))
  const phone = snapshot?.phone !== undefined
    ? snapshot.phone
    : (invoice.templates?.phone || (isEdlinkAu ? '+61 432 536 123' : ''))
  const currency = snapshot?.currency || invoice.companies?.currency || 'AUD'
  const footerTerms = snapshot?.footer_terms || invoice.templates?.footer_terms || 'Thank you for getting services from us'
  const paymentDetails = snapshot?.payment_details !== undefined
    ? snapshot.payment_details
    : (invoice.templates?.payment_details || (isEdlinkAu ? `Account Name: Riaz & Sons PTY Ltd\nBSB: 083-543\nAccount No: 72-996-1834\nABN: 62 658 488 469` : ''))

  const items = invoice.invoice_items || []
  const calculatedSubtotal = items.reduce((sum, item) => sum + Number(item.line_total || item.amount * item.quantity || 0), 0)
  const subtotal = Number(invoice.subtotal) > 0 ? Number(invoice.subtotal) : calculatedSubtotal
  const gstRate = Number(snapshot?.gst_rate || 0)
  const gstAmount = Number(snapshot?.gst_amount) > 0 ? Number(snapshot?.gst_amount) : Number(((subtotal * gstRate) / 100).toFixed(2))
  const totalAmount = Number(invoice.total_amount) > 0 ? Number(invoice.total_amount) : (subtotal + gstAmount)

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const hasContactInfo = Boolean(address || email || phone)

  return (
    <div className="mx-auto w-full max-w-[850px] bg-white p-4 sm:p-8 md:p-12 shadow-sm font-sans text-slate-800 border border-slate-200 rounded-md">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 pb-6">
        {/* Left Column: Logo & Company Contact */}
        <div className="space-y-3 max-w-[340px] w-full sm:w-auto">
          {/* Logo reproduction */}
          <div className="flex justify-start items-start">
            <img
              src={snapshot?.logo_url || invoice.companies?.logo_url || '/edlink-logo.png'}
              alt={companyName}
              className="h-12 sm:h-16 object-contain object-left"
            />
          </div>

          {hasContactInfo ? (
            <div className="text-[11.5px] sm:text-[12.5px] leading-snug text-slate-800 space-y-0.5 pt-1">
              {address ? <p><span className="font-bold text-slate-900">Add:</span> {address}</p> : null}
              {email ? <p><span className="font-bold text-slate-900">Email:</span> {email}</p> : null}
              {phone ? <p><span className="font-bold text-slate-900">Phone:</span> {phone}</p> : null}
            </div>
          ) : null}
        </div>

        {/* Right Column: Title & Header Metadata Box */}
        <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-wider text-[#5C7C99] uppercase mb-2 sm:mb-4">
            INVOICE
          </h1>

          {/* Header Metadata Table */}
          <div className="w-full sm:w-[340px] border border-slate-300 text-center text-xs">
            <div className="grid grid-cols-3 bg-[#DCE6F1] font-bold text-slate-800 border-b border-slate-300 py-1.5 sm:py-2 px-2 uppercase text-[11px] sm:text-[12px]">
              <div>INVOICE #</div>
              <div>DATE</div>
              <div>DUE DATE</div>
            </div>
            <div className="grid grid-cols-3 py-2 px-2 text-slate-900 font-bold text-[11.5px] sm:text-[13px]">
              <div className="truncate">{invoice.invoice_number || '00327'}</div>
              <div>{formatDate(invoice.invoice_date)}</div>
              <div>{formatDate(invoice.due_date)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="mt-4 sm:mt-6 mb-4 sm:mb-6 w-full sm:max-w-[340px] border border-slate-300">
        <div className="bg-[#DCE6F1] px-3 py-1.5 text-[11px] sm:text-[12px] font-bold uppercase text-slate-800 tracking-wider border-b border-slate-300">
          BILL TO
        </div>
        <div className="p-3 sm:p-3.5 text-[13px] sm:text-[15px] font-bold text-slate-900 bg-white min-h-[44px] sm:min-h-[50px]">
          {invoice.customer_name ? (
            <p>{invoice.customer_name}</p>
          ) : (
            <p className="text-slate-400 italic font-normal">[Customer Name]</p>
          )}
          {invoice.reference_name && (
            <p className="text-xs text-slate-500 font-normal mt-0.5">Ref: {invoice.reference_name}</p>
          )}
        </div>
      </div>

      {/* Main Details Table */}
      <div className="my-4 sm:my-6 border border-slate-300 rounded-xs overflow-hidden text-xs">
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-[#DCE6F1] font-bold text-slate-800 border-b border-slate-300 uppercase text-[11px] sm:text-[12px]">
          <div className="col-span-8 sm:col-span-9 py-2 sm:py-2.5 px-3 sm:px-4 border-r border-slate-300">DESCRIPTION</div>
          <div className="col-span-4 sm:col-span-3 py-2 sm:py-2.5 px-3 sm:px-4 text-right">AMOUNT</div>
        </div>

        {/* Table Body with Vertical Column Divider */}
        <div className="min-h-[220px] sm:min-h-[290px] bg-white grid grid-cols-12">
          {/* Left Description Column */}
          <div className="col-span-8 sm:col-span-9 border-r border-slate-300 p-3 sm:p-4 space-y-3">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <p className="text-[12.5px] sm:text-[14px] font-medium text-slate-900">{item.description || 'Service Description'}</p>
                  {item.quantity > 1 && (
                    <p className="text-[11px] sm:text-[12px] text-slate-500">Qty: {item.quantity} × {item.amount} {currency}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic text-[12px] sm:text-[13px]">No items added</p>
            )}
          </div>

          {/* Right Amount Column */}
          <div className="col-span-4 sm:col-span-3 p-3 sm:p-4 space-y-3 text-right">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <p className="text-[12.5px] sm:text-[14px] font-bold text-slate-900">
                    {Number(item.line_total || item.amount * item.quantity).toFixed(2)} {currency}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-[12px] text-transparent select-none">Qty</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-[12px] sm:text-[13px]">0.00 {currency}</p>
            )}
          </div>
        </div>

        {/* Footer Row inside Table */}
        {gstRate > 0 ? (
          <div className="border-t border-slate-300 bg-white divide-y divide-slate-200">
            <div className="grid grid-cols-12 py-2 px-3 sm:px-4 text-xs">
              <div className="col-span-12 sm:col-span-6 text-slate-800 text-[11px] sm:text-[12.5px] self-center">
                {footerTerms}
              </div>
              <div className="col-span-6 sm:col-span-3 text-left sm:text-right uppercase font-semibold text-slate-600 text-[11px] sm:text-[12px] self-center sm:border-r sm:border-slate-300 sm:pr-3">
                SUBTOTAL
              </div>
              <div className="col-span-6 sm:col-span-3 text-right font-bold text-[12px] sm:text-[13px] text-slate-800 self-center">
                {Number(subtotal).toFixed(2)} {currency}
              </div>
            </div>
            <div className="grid grid-cols-12 py-2 px-3 sm:px-4 text-xs bg-slate-50/50">
              <div className="col-span-12 sm:col-span-6"></div>
              <div className="col-span-6 sm:col-span-3 text-left sm:text-right uppercase font-semibold text-slate-600 text-[11px] sm:text-[12px] self-center sm:border-r sm:border-slate-300 sm:pr-3">
                GST ({gstRate}%)
              </div>
              <div className="col-span-6 sm:col-span-3 text-right font-bold text-[12px] sm:text-[13px] text-slate-800 self-center">
                {Number(gstAmount).toFixed(2)} {currency}
              </div>
            </div>
            <div className="grid grid-cols-12 py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-slate-900 bg-slate-100/70">
              <div className="col-span-12 sm:col-span-6"></div>
              <div className="col-span-6 sm:col-span-3 text-left sm:text-right uppercase font-extrabold text-slate-900 text-[12px] sm:text-[13px] self-center sm:border-r sm:border-slate-300 sm:pr-3">
                TOTAL DUE
              </div>
              <div className="col-span-6 sm:col-span-3 text-right font-extrabold text-[13px] sm:text-[15px] text-slate-900 self-center">
                {Number(totalAmount).toFixed(2)} {currency}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 border-t border-slate-300 bg-white py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-slate-900 gap-y-2">
            <div className="col-span-12 sm:col-span-6 text-slate-800 text-[11px] sm:text-[13px] self-center">
              {footerTerms}
            </div>
            <div className="col-span-6 sm:col-span-3 text-left sm:text-right uppercase font-bold text-slate-900 text-[12px] sm:text-[14px] self-center sm:border-r sm:border-slate-300 sm:pr-3">
              TOTAL DUE
            </div>
            <div className="col-span-6 sm:col-span-3 text-right font-extrabold text-[13px] sm:text-[15px] text-slate-900 self-center">
              {Number(totalAmount).toFixed(2)} {currency}
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Section (only if not empty) */}
      {paymentDetails && paymentDetails.trim() ? (
        <div className="mt-8 pt-4 text-xs text-slate-800">
          <h3 className="font-bold underline text-slate-900 mb-1.5 text-[13px]">Payment Details</h3>
          <div className="whitespace-pre-line leading-relaxed text-[12.5px] font-medium text-slate-800">
            {paymentDetails}
          </div>
        </div>
      ) : null}
    </div>
  )
}
