'use client'

import React from 'react'
import { InvoiceWithDetails, TemplateSnapshot } from '@/lib/supabase/database.types'

interface DefaultWebPreviewProps {
  invoice: Partial<InvoiceWithDetails>
  snapshot?: TemplateSnapshot
}

export default function DefaultWebPreview({ invoice, snapshot }: DefaultWebPreviewProps) {
  const companyName = snapshot?.company_name || invoice.companies?.name || 'Company Name'
  const address = snapshot?.address || invoice.templates?.address || ''
  const email = snapshot?.email || invoice.templates?.email || ''
  const phone = snapshot?.phone || invoice.templates?.phone || ''
  const currency = snapshot?.currency || invoice.companies?.currency || 'USD'
  const primaryColor = snapshot?.primary_color || invoice.templates?.primary_color || '#2563eb'
  const footerTerms = snapshot?.footer_terms || invoice.templates?.footer_terms || 'Thank you for your business.'
  const paymentDetails = snapshot?.payment_details || invoice.templates?.payment_details || ''

  const items = invoice.invoice_items || []
  const totalAmount = invoice.total_amount || invoice.subtotal || 0

  return (
    <div className="mx-auto w-full max-w-[850px] bg-white p-8 sm:p-12 shadow-sm font-sans text-slate-800 border border-slate-200 rounded-md">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-8 gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{companyName}</h1>
          <div className="text-xs text-slate-500 mt-2 space-y-1">
            {address && <p>{address}</p>}
            {email && <p>Email: {email}</p>}
            {phone && <p>Phone: {phone}</p>}
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span
            className="text-3xl font-extrabold uppercase tracking-wide block"
            style={{ color: primaryColor }}
          >
            INVOICE
          </span>
          <div className="mt-3 text-xs space-y-1 text-slate-600">
            <p><span className="font-semibold text-slate-700">Invoice #:</span> {invoice.invoice_number || 'INV-000001'}</p>
            <p><span className="font-semibold text-slate-700">Date:</span> {invoice.invoice_date || 'N/A'}</p>
            <p><span className="font-semibold text-slate-700">Due Date:</span> {invoice.due_date || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="my-8 p-4 bg-slate-50 border border-slate-200 rounded-md">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Bill To</h3>
        <p className="text-base font-bold text-slate-900">{invoice.customer_name || '[Customer Name]'}</p>
        {invoice.reference_name && (
          <p className="text-xs text-slate-600 mt-0.5">Reference: {invoice.reference_name}</p>
        )}
      </div>

      {/* Items Table */}
      <div className="my-8 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{item.description}</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right text-slate-600">{Number(item.amount).toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                    {Number(item.line_total || item.amount * item.quantity).toFixed(2)} {currency}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-4 px-4 text-center text-slate-400 italic">
                  No invoice items added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Total Row */}
      <div className="flex justify-between items-start pt-4 border-t border-slate-200">
        <div className="max-w-[360px] text-xs text-slate-600">
          {paymentDetails && (
            <div className="mb-4">
              <h4 className="font-bold text-slate-800 mb-1">Payment Details:</h4>
              <p className="whitespace-pre-line text-slate-600">{paymentDetails}</p>
            </div>
          )}
          <p className="italic">{footerTerms}</p>
        </div>

        <div className="w-48 text-right bg-slate-50 p-4 border border-slate-200 rounded-md">
          <span className="text-xs font-semibold text-slate-500 block uppercase">Total Amount</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {Number(totalAmount).toFixed(2)} {currency}
          </span>
        </div>
      </div>
    </div>
  )
}
