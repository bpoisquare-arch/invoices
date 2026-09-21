'use client'

import React from 'react'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'
import { numberToWords } from '@/lib/utils/number-to-words'

interface NSCWebPreviewProps {
  invoice: Partial<InvoiceWithDetails>
  snapshot?: TemplateSnapshot
}

export default function NSCWebPreview({ invoice, snapshot }: NSCWebPreviewProps) {
  const companyName = snapshot?.company_name || 'Neighbourhood Shine Co.'
  const logoUrl = snapshot?.logo_url || '/Neighbourhood-Shine.png'
  const items = invoice.invoice_items || []

  // Subtotal from items or invoice
  const subtotal = invoice.subtotal !== undefined && invoice.subtotal !== null
    ? Number(invoice.subtotal)
    : items.reduce((sum, item) => sum + (Number(item.line_total) || (Number(item.quantity || 1) * Number(item.amount || 0))), 0)

  // GST calculation
  const gstRate = Number(invoice.template_snapshot?.gst_rate ?? snapshot?.gst_rate ?? 10)
  const gstAmount = Number(invoice.template_snapshot?.gst_amount ?? ((subtotal * gstRate) / 100))
  const totalIncludingGst = Number(invoice.total_amount ?? (subtotal + gstAmount))
  const amountInWords = invoice.template_snapshot?.amount_in_words
    ? String(invoice.template_snapshot.amount_in_words)
    : numberToWords(totalIncludingGst, invoice.template_snapshot?.currency || snapshot?.currency || 'AUD')

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthIdx = parseInt(parts[1], 10) - 1
      const monthName = months[monthIdx] || parts[1]
      return `${parts[2]}-${monthName}-${parts[0].slice(2)}`
    }
    return dateStr
  }

  return (
    <div className="mx-auto w-full max-w-[850px] bg-white p-6 sm:p-10 shadow-sm font-sans text-slate-900 border-2 border-black rounded-xs space-y-6 sm:space-y-7">
      {/* 1. Header Box */}
      <div className="border-2 border-black p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start gap-4 relative overflow-hidden">
        {/* Left Side: Green geometric accent & company info */}
        <div className="flex items-start gap-3 max-w-[420px]">
          {/* Green polygon shape */}
          <div className="hidden sm:block w-9 self-stretch bg-[#8CB34E] shrink-0" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />

          <div className="text-[12px] leading-tight text-black space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-black mb-1.5 font-sans">
              {companyName}
            </h1>
            <p className="font-semibold text-black text-[12.5px]">ABN 65 696 388 324</p>
            <p className="text-black font-medium">Account number 313369861</p>
            <p className="text-black font-medium">BSB 083004</p>
            <p className="text-black font-medium">Account Tittle: Neighbourhood Shine Co</p>
            <p className="text-black font-bold">PAY ID 0421 953 400</p>
          </div>
        </div>

        {/* Right Side: Logo */}
        <div className="shrink-0 flex items-center justify-end">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Neighbourhood Shine Co. Logo"
              className="max-h-[90px] max-w-[170px] object-contain"
            />
          ) : (
            <div className="h-16 w-32 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
              No Logo
            </div>
          )}
        </div>
      </div>

      {/* 2. Metadata Tables Row */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Left: Bill To & Address Table */}
        <div className="col-span-12 sm:col-span-7 border-2 border-black text-xs">
          <div className="grid grid-cols-12 border-b-2 border-black">
            <div className="col-span-4 p-1.5 border-r-2 border-black font-bold text-black">
              Bill To
            </div>
            <div className="col-span-8 p-1.5 font-bold text-black">
              {invoice.customer_name || '[Customer Name]'}
            </div>
          </div>
          <div className="grid grid-cols-12">
            <div className="col-span-4 p-1.5 border-r-2 border-black font-bold text-black">
              Address
            </div>
            <div className="col-span-8 p-1.5 text-black">
              {invoice.reference_name || snapshot?.address || '22 Cheviot Avenue Berwick'}
            </div>
          </div>
        </div>

        {/* Right: Invoice #, Date, ABN #, Total Paid Table */}
        <div className="col-span-12 sm:col-span-5 space-y-2">
          <div className="border-2 border-black text-xs">
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-6 p-1.5 border-r-2 border-black font-bold text-black">
                Invoice #
              </div>
              <div className="col-span-6 p-1.5 text-center font-bold text-black font-mono">
                {invoice.invoice_number || '1001'}
              </div>
            </div>
            <div className="grid grid-cols-12 border-b-2 border-black">
              <div className="col-span-6 p-1.5 border-r-2 border-black font-bold text-black">
                Date
              </div>
              <div className="col-span-6 p-1.5 text-center font-bold text-black">
                {formatDate(invoice.invoice_date)}
              </div>
            </div>
            <div className="grid grid-cols-12">
              <div className="col-span-6 p-1.5 border-r-2 border-black font-bold text-black">
                ABN #
              </div>
              <div className="col-span-6 p-1.5 text-center font-bold text-black text-[11px]">
                65 696 388 324
              </div>
            </div>
          </div>

          {/* Total Paid(AUD) reflects Total Including GST */}
          <div className="border-2 border-black text-xs font-bold grid grid-cols-12">
            <div className="col-span-6 p-1.5 border-r-2 border-black bg-white text-black">
              Total Paid(AUD)
            </div>
            <div className="col-span-6 p-1.5 text-center bg-white text-black font-extrabold text-[12.5px]">
              AUD {totalIncludingGst.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Items / Details of Job Table */}
      <div className="border-2 border-black text-xs">
        {/* Table Header */}
        <div className="grid grid-cols-12 border-b-2 border-black font-bold text-center text-[12px] bg-white">
          <div className="col-span-7 p-2 border-r-2 border-black text-center">
            Details of Job
          </div>
          <div className="col-span-1 p-2 border-r-2 border-black text-center">
            Quantity
          </div>
          <div className="col-span-2 p-2 border-r-2 border-black text-center">
            Rate
          </div>
          <div className="col-span-2 p-2 text-center">
            Amount
          </div>
        </div>

        {/* Table Rows - Only entered items */}
        {items.length > 0 ? (
          items.map((item, idx) => {
            const qty = Number(item.quantity) || 1
            const amt = Number(item.amount) || 0
            const rate = qty > 0 ? (amt / qty).toFixed(2) : amt.toFixed(2)
            return (
              <div key={idx} className="grid grid-cols-12 border-b border-black font-medium min-h-[42px] items-center">
                <div className="col-span-7 p-2.5 border-r-2 border-black whitespace-pre-line text-black text-[12px] leading-relaxed">
                  {item.description || 'General Cleaning Services'}
                </div>
                <div className="col-span-1 p-2.5 border-r-2 border-black text-center text-black">
                  {qty}
                </div>
                <div className="col-span-2 p-2.5 border-r-2 border-black text-center text-black">
                  {rate}
                </div>
                <div className="col-span-2 p-2.5 text-center font-bold text-black">
                  {amt.toFixed(2)}
                </div>
              </div>
            )
          })
        ) : (
          <div className="grid grid-cols-12 border-b border-black font-medium min-h-[50px] items-center">
            <div className="col-span-7 p-2.5 border-r-2 border-black whitespace-pre-line text-black text-[12px] leading-relaxed">
              3 bedrooms 2 bathrooms
            </div>
            <div className="col-span-1 p-2.5 border-r-2 border-black text-center text-black">
              1
            </div>
            <div className="col-span-2 p-2.5 border-r-2 border-black text-center text-black">
              {Number(subtotal).toFixed(2)}
            </div>
            <div className="col-span-2 p-2.5 text-center font-bold text-black">
              {Number(subtotal).toFixed(2)}
            </div>
          </div>
        )}

        {/* Row 1: Amount In Word & Subtotal */}
        <div className="grid grid-cols-12 font-bold text-xs bg-white border-t-2 border-black">
          <div className="col-span-8 p-2 border-r-2 border-black text-left flex items-center gap-1.5 overflow-hidden">
            <span className="font-bold text-black uppercase text-[11px] shrink-0">Amount In Word:</span>
            <span className="font-semibold italic text-slate-800 text-[11px] truncate capitalize">
              {amountInWords}
            </span>
          </div>
          <div className="col-span-4 p-2 text-center font-bold text-black text-[12px]">
            AUD {subtotal.toFixed(2)}
          </div>
        </div>

        {/* Row 2: GST % and GST Amount */}
        <div className="grid grid-cols-12 font-bold text-xs bg-white border-t border-black">
          <div className="col-span-8 p-2 border-r-2 border-black text-right pr-4 uppercase text-[11px]">
            GST {gstRate > 0 ? `(${gstRate}%)` : '%'}
          </div>
          <div className="col-span-4 p-2 text-center font-bold text-black text-[12px]">
            AUD {gstAmount.toFixed(2)}
          </div>
        </div>

        {/* Row 3: Total Including GST */}
        <div className="grid grid-cols-12 font-bold text-xs bg-white border-t-2 border-black">
          <div className="col-span-8 p-2.5 border-r-2 border-black text-right pr-4 uppercase text-[11px] tracking-wide">
            Total Including GST
          </div>
          <div className="col-span-4 p-2.5 text-center font-extrabold text-black text-[13px]">
            AUD {totalIncludingGst.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 4. Bank Account & Pay ID Details (Placed directly below table) */}
      <div className="space-y-4 text-xs pt-1">
        <div>
          <h3 className="font-bold underline text-black text-[12px] uppercase tracking-wide mb-1.5">
            BANK ACCOUNT DETAILS
          </h3>
          <div className="grid grid-cols-12 max-w-[420px] text-[12px] leading-relaxed">
            <div className="col-span-5 font-semibold text-black">Bank Name</div>
            <div className="col-span-7 text-black">Common Wealth Bank</div>
            <div className="col-span-5 font-semibold text-black">Account Name</div>
            <div className="col-span-7 text-black">Neighbourhood Shine Co</div>
            <div className="col-span-5 font-semibold text-black">Account Number</div>
            <div className="col-span-7 text-black font-mono">313369861</div>
            <div className="col-span-5 font-semibold text-black">BSB / IFSC</div>
            <div className="col-span-7 text-black font-mono">083-004</div>
          </div>
        </div>

        <div>
          <h3 className="font-bold underline text-black text-[12px] uppercase tracking-wide mb-1.5">
            PAY ID DETAILS
          </h3>
          <div className="grid grid-cols-12 max-w-[420px] text-[12px] leading-relaxed">
            <div className="col-span-5 font-semibold text-black">Account Name</div>
            <div className="col-span-7 text-black">Neighbourhood Shine Co</div>
            <div className="col-span-5 font-semibold text-black">PAY ID</div>
            <div className="col-span-7 text-black font-bold">0421 953 400</div>
          </div>
        </div>
      </div>

      {/* 5. Terms & Conditions Box */}
      <div>
        <h3 className="font-bold text-black text-[12px] mb-1.5">
          Terms & Conditions
        </h3>
        <div className="border-2 border-black p-4 relative overflow-hidden bg-white text-[11px] leading-relaxed text-black">
          {/* Green accent triangle on bottom right */}
          <div
            className="absolute bottom-0 right-0 w-16 h-16 bg-[#8CB34E]/90 pointer-events-none"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
          />

          <ul className="space-y-1 pr-8 list-none">
            <li>• Payment is required on arrival on the day of service.</li>
            <li>• The customer is responsible for arranging suitable parking for our service vehicle.</li>
            <li>• Access to electricity and running hot water must be available at the property.</li>
            <li>• While we make every effort, complete removal of pet hair cannot be guaranteed.</li>
            <li>• The property must be vacant at the time of cleaning.</li>
            <li>• Quoted pricing is based on properties in standard/normal condition. Heavily soiled properties may incur additional charges.</li>
            <li>• Ceilings and garage walls are excluded from the service.</li>
            <li>• Payment can be made via cash, bank transfer, or Pay ID.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
