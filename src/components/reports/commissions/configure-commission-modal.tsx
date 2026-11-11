'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Percent,
  DollarSign,
  Calculator,
  Building2,
  Check,
  Loader2,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react'
import type { CommissionType, AgentCommissionRule } from '@/lib/services/agent-commission.service'

interface ConfigureCommissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName: string | null
  currentRule?: AgentCommissionRule | null
  onSaved: (rule: AgentCommissionRule) => void
  onDeleted: (agentName: string) => void
}

export default function ConfigureCommissionModal({
  open,
  onOpenChange,
  agentName,
  currentRule,
  onSaved,
  onDeleted,
}: ConfigureCommissionModalProps) {
  const [activeTab, setActiveTab] = useState<CommissionType>('percentage')
  const [rate, setRate] = useState<string>('15')
  const [notes, setNotes] = useState<string>('')
  const [testFee, setTestFee] = useState<string>('4000')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize form when modal opens or rule/agent changes
  useEffect(() => {
    if (open && agentName) {
      setErrorMsg(null)
      if (currentRule) {
        setActiveTab(currentRule.type || 'percentage')
        setRate(String(currentRule.rate ?? (currentRule.type === 'fixed' ? '500' : '15')))
        setNotes(currentRule.notes || '')
      } else {
        setActiveTab('percentage')
        setRate('15')
        setNotes('')
      }
    }
  }, [open, agentName, currentRule])

  if (!agentName) return null

  // Calculate live preview
  const numRate = parseFloat(rate) || 0
  const numTestFee = parseFloat(testFee) || 0

  const previewPayable =
    activeTab === 'percentage'
      ? (numTestFee * numRate) / 100
      : activeTab === 'net_remainder'
      ? Math.max(0, numTestFee - numRate)
      : numRate

  const handleSave = async () => {
    setErrorMsg(null)
    const numericRate = parseFloat(rate)
    if (isNaN(numericRate) || numericRate < 0) {
      setErrorMsg('Please enter a valid positive number for the commission.')
      return
    }

    if (activeTab === 'percentage' && numericRate > 100) {
      setErrorMsg('Percentage cannot exceed 100%.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/reports/commissions/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName,
          type: activeTab,
          rate: numericRate,
          notes,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save commission setting')
      }

      onSaved(data.rule)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error saving rule:', err)
      setErrorMsg(err.message || 'Something went wrong while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to reset and clear the commission rule for ${agentName}?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(
        `/api/reports/commissions/settings?agentName=${encodeURIComponent(agentName)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset commission setting')
      }

      onDeleted(agentName)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error deleting rule:', err)
      setErrorMsg(err.message || 'Failed to reset rule.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Top Gradient Header */}
        <div className="relative bg-gradient-to-r from-[#002233] via-[#003D5C] to-[#0E3E5B] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-[#009D9E]/20 border border-[#81F5F5]/30 flex items-center justify-center text-[#81F5F5] shrink-0 shadow-inner">
              <Building2 className="size-5.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#81F5F5] bg-[#81F5F5]/10 px-2 py-0.5 rounded-full border border-[#81F5F5]/20">
                  Commission Rule
                </span>
                {currentRule && (
                  <span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                    <Check className="size-3" /> Configured
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold truncate text-white mt-0.5" title={agentName}>
                {agentName}
              </h2>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* 3 Option Tabs */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Commission Type
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              {/* Tab 1: By Percentage */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('percentage')
                  if (!currentRule || currentRule.type !== 'percentage') {
                    setRate('35')
                  } else {
                    setRate(String(currentRule.rate))
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  activeTab === 'percentage'
                    ? 'bg-white text-[#003D5C] shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Percent className={`size-3.5 ${activeTab === 'percentage' ? 'text-[#009D9E]' : ''}`} />
                <span>Percentage (%)</span>
              </button>

              {/* Tab 2: By Fixed */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('fixed')
                  if (!currentRule || currentRule.type !== 'fixed') {
                    setRate('4000')
                  } else {
                    setRate(String(currentRule.rate))
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  activeTab === 'fixed'
                    ? 'bg-white text-[#003D5C] shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <DollarSign className={`size-3.5 ${activeTab === 'fixed' ? 'text-indigo-600' : ''}`} />
                <span>Fixed ($ AUD)</span>
              </button>

              {/* Tab 3: Net Remainder (Course Fee - College Share) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('net_remainder')
                  if (!currentRule || currentRule.type !== 'net_remainder') {
                    setRate('4000')
                    setTestFee('9500')
                  } else {
                    setRate(String(currentRule.rate))
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  activeTab === 'net_remainder'
                    ? 'bg-white text-purple-950 shadow-sm border border-purple-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Calculator className={`size-3.5 ${activeTab === 'net_remainder' ? 'text-purple-600' : ''}`} />
                <span>Net Remainder</span>
              </button>
            </div>
          </div>

          {/* Input Field Based on Selected Tab */}
          {activeTab === 'percentage' ? (
            <div className="space-y-2 bg-teal-50/50 p-4 rounded-xl border border-teal-200/70">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Percent className="size-3.5 text-teal-700" />
                  Commission Percentage Rate
                </label>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md">
                  % of Student Fee Paid
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 35"
                  className="h-11 text-base font-bold bg-white text-slate-800 pr-10 border-teal-300 focus:border-teal-500 focus:ring-teal-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  %
                </span>
              </div>
              <p className="text-[11px] text-teal-800 flex items-start gap-1 mt-1 leading-relaxed">
                <Info className="size-3.5 shrink-0 mt-0.5 text-teal-600" />
                <span>
                  Formula: <strong>Payable = Student Fee Paid × {numRate}%</strong>.
                  Applied in real-time as each student makes payment.
                </span>
              </p>
            </div>
          ) : activeTab === 'fixed' ? (
            <div className="space-y-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/70">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-indigo-700" />
                  Fixed Commission Amount (AUD)
                </label>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                  Flat per Enrolled Student
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 4000"
                  className="h-11 text-base font-bold bg-white text-slate-800 pl-8 pr-14 border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-xs">
                  AUD
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 flex items-start gap-1 mt-1 leading-relaxed">
                <Info className="size-3.5 shrink-0 mt-0.5 text-indigo-600" />
                <span>
                  Formula: <strong>Payable = ${numRate.toLocaleString()} AUD</strong> flat per student,
                  regardless of the installments breakdown.
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-2 bg-purple-50/60 p-4 rounded-xl border border-purple-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-purple-700" />
                  College Retained Share ($ AUD)
                </label>
                <span className="text-[11px] font-semibold text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md">
                  College Keeps First $ AUD
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 4000 or 3000"
                  className="h-11 text-base font-bold bg-white text-slate-800 pl-8 pr-14 border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-400 text-xs">
                  AUD
                </span>
              </div>
              <p className="text-[11px] text-purple-900 flex items-start gap-1 mt-1 leading-relaxed">
                <Info className="size-3.5 shrink-0 mt-0.5 text-purple-600" />
                <span>
                  Formula: <strong>Payable = Total Course Fee - ${numRate.toLocaleString()} AUD (College Share)</strong>.
                  Example: If course is $9,500 and college share is $4,000, agent receives the remainder <strong>$5,500 AUD</strong>.
                </span>
              </p>
            </div>
          )}

          {/* Interactive Live Preview Calculator */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-slate-800">
                <Calculator className="size-3.5 text-[#009D9E]" />
                Live Formula Preview
              </span>
              <div className="flex items-center gap-1 text-[11px] font-normal text-slate-500">
                <span>{activeTab === 'net_remainder' ? 'Course Fee:' : 'Sample Fee:'}</span>
                <span className="font-semibold text-slate-700">$</span>
                <input
                  type="number"
                  value={testFee}
                  onChange={(e) => setTestFee(e.target.value)}
                  className="w-18 h-6 px-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
              <div className="text-xs text-slate-600">
                <div className="font-medium">
                  {activeTab === 'percentage' ? (
                    <span>
                      ${numTestFee.toLocaleString()} AUD × {numRate}%
                    </span>
                  ) : activeTab === 'net_remainder' ? (
                    <span>
                      Course Fee (${numTestFee.toLocaleString()}) - College Base (${numRate.toLocaleString()})
                    </span>
                  ) : (
                    <span>Flat Fixed Rate</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">Agent Commission Calculated</div>
              </div>

              <div className="text-right">
                <div className="text-base font-extrabold text-[#003D5C] font-mono">
                  ${previewPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD
                </div>
                <div className="text-[10px] font-semibold text-[#009D9E] uppercase tracking-wider">
                  Payable To Agent
                </div>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Internal Notes / Contract Reference (Optional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard 2026 Agency Agreement, Tier 1 rate"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            {currentRule && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isSaving || isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs gap-1.5 font-semibold h-9 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>Clear Rule</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isDeleting}
              className="h-9 px-4 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="bg-gradient-to-r from-[#003D5C] to-[#002233] hover:from-[#00283d] hover:to-[#001724] text-[#81F5F5] font-bold h-9 px-5 rounded-xl text-xs gap-1.5 cursor-pointer shadow-sm border border-cyan-500/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-[#81F5F5]" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5 text-[#81F5F5]" />
                  <span>Save Commission Rule</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

