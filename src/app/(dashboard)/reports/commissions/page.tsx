'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  BadgePercent,
  Search,
  RotateCcw,
  Percent,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Calculator,
  Loader2,
  Edit,
  ArrowRight,
  Layers,
  FileSpreadsheet,
  Users,
  Settings,
  Receipt,
  User,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import RecordPayoutModal from '@/components/reports/commissions/record-payout-modal'
import type { AimtReportRecord } from '@/types/database.types'
import type { AgentCommissionRule } from '@/lib/services/agent-commission.service'
import type { StudentCommissionPayout } from '@/lib/services/agent-payout.service'
import { PREDEFINED_AGENTS } from '@/lib/constants/aimt-agents'

export default function AgentCommissionsPage() {
  const [records, setRecords] = useState<AimtReportRecord[]>([])
  const [rules, setRules] = useState<Record<string, AgentCommissionRule>>({})
  const [payouts, setPayouts] = useState<Record<string, StudentCommissionPayout>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'full' | 'partial' | 'unpaid' | 'no-rule'>('all')

  // Selected student for payout modal
  const [payoutModalStudent, setPayoutModalStudent] = useState<{
    recordId: string
    studentName: string
    studentId: string
    agentName: string
    feePaid: number
    commissionPayable: number
    rule?: AgentCommissionRule | null
    currentPayout?: StudentCommissionPayout | null
  } | null>(null)
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false)

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [reportsRes, settingsRes, payoutsRes] = await Promise.all([
        fetch(`/api/reports?pageSize=5000&t=${Date.now()}`, { cache: 'no-store' }),
        fetch('/api/reports/commissions/settings', { cache: 'no-store' }),
        fetch('/api/reports/commissions/payouts', { cache: 'no-store' }),
      ])

      const [reportsData, settingsData, payoutsData] = await Promise.all([
        reportsRes.json(),
        settingsRes.json(),
        payoutsRes.json(),
      ])

      if (reportsData.success && Array.isArray(reportsData.records)) {
        setRecords(reportsData.records)
      }
      if (settingsData.success && settingsData.rules) {
        setRules(settingsData.rules)
      }
      if (payoutsData.success && payoutsData.payouts) {
        setPayouts(payoutsData.payouts)
      }
    } catch (err) {
      console.error('Failed to fetch commissions data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Helper to extract fee paid by student
  const getFeePaid = useCallback((r: AimtReportRecord): number => {
    if (typeof r.paid_amount === 'number' && r.paid_amount > 0) return r.paid_amount
    if (typeof (r as any).initial_payment === 'number' && (r as any).initial_payment > 0) return (r as any).initial_payment
    if (typeof (r as any).total_paid === 'number' && (r as any).total_paid > 0) return (r as any).total_paid

    const total = Number(r.total_fee) || 0
    const pending = Number(r.pending_amount) || 0
    const yet =
      typeof r.yet_to_raised === 'number'
        ? r.yet_to_raised
        : parseFloat(String(r.yet_to_raised || '0').replace(/[^0-9.-]+/g, '')) || 0
    const calc = total - (pending + yet)
    return calc > 0 ? calc : 0
  }, [])

  // Helper to find configured rule for an agent name (with trimmed fuzzy fallback)
  const getRuleForAgent = useCallback(
    (agentName?: string | null): AgentCommissionRule | null => {
      if (!agentName) return null
      const trimmed = agentName.trim()
      if (rules[trimmed]) return rules[trimmed]

      // Case-insensitive fallback
      const foundKey = Object.keys(rules).find(
        (k) => k.toLowerCase() === trimmed.toLowerCase()
      )
      return foundKey ? rules[foundKey] : null
    },
    [rules]
  )

  // Compute calculated commission rows for all records
  const calculatedRows = useMemo(() => {
    return records
      .filter((r) => r.agent && r.agent.trim() !== '' && r.agent.trim() !== '-')
      .map((record) => {
        const feePaid = getFeePaid(record)
        const rule = getRuleForAgent(record.agent)
        const payout = payouts[record.id]
        const commissionPaid = payout?.commissionPaid ?? 0

        let commissionPayable = 0
        if (rule) {
          if (rule.type === 'percentage') {
            commissionPayable = Math.round(((feePaid * rule.rate) / 100) * 100) / 100
          } else if (rule.type === 'fixed') {
            commissionPayable = rule.rate
          }
        }

        const balanceDue = Math.max(0, Math.round((commissionPayable - commissionPaid) * 100) / 100)

        let status: 'full' | 'partial' | 'unpaid' | 'no-rule' = 'no-rule'
        if (rule) {
          if (commissionPayable > 0 && commissionPaid >= commissionPayable) {
            status = 'full'
          } else if (commissionPaid > 0) {
            status = 'partial'
          } else {
            status = 'unpaid'
          }
        }

        return {
          record,
          feePaid,
          rule,
          commissionPayable,
          commissionPaid,
          balanceDue,
          status,
          payout,
        }
      })
  }, [records, getFeePaid, getRuleForAgent, payouts])

  // Filtered rows
  const filteredRows = useMemo(() => {
    return calculatedRows.filter((row) => {
      // Agent filter
      if (selectedAgent !== 'all') {
        const agent = (row.record.agent || '').toLowerCase().trim()
        if (agent !== selectedAgent.toLowerCase().trim()) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const nameMatch = (row.record.student_name || '').toLowerCase().includes(query)
        const idMatch = (row.record.student_id || '').toLowerCase().includes(query)
        const agentMatch = (row.record.agent || '').toLowerCase().includes(query)
        if (!nameMatch && !idMatch && !agentMatch) return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (row.status !== statusFilter) return false
      }

      return true
    })
  }, [calculatedRows, selectedAgent, searchQuery, statusFilter])

  // Overall KPI statistics
  const stats = useMemo(() => {
    let totalFee = 0
    let totalPayable = 0
    let totalPaid = 0

    filteredRows.forEach((r) => {
      totalFee += r.feePaid
      totalPayable += r.commissionPayable
      totalPaid += r.commissionPaid
    })

    const totalBalance = Math.max(0, totalPayable - totalPaid)

    return {
      totalStudents: filteredRows.length,
      totalFee: Math.round(totalFee * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalBalance: Math.round(totalBalance * 100) / 100,
    }
  }, [filteredRows])

  // Open payout modal
  const handleOpenPayout = (row: (typeof calculatedRows)[0]) => {
    setPayoutModalStudent({
      recordId: row.record.id,
      studentName: row.record.student_name,
      studentId: row.record.student_id || '',
      agentName: row.record.agent || '',
      feePaid: row.feePaid,
      commissionPayable: row.commissionPayable,
      rule: row.rule,
      currentPayout: row.payout,
    })
    setIsPayoutModalOpen(true)
  }

  const handleSavedPayout = (newPayout: StudentCommissionPayout) => {
    setPayouts((prev) => ({
      ...prev,
      [newPayout.recordId]: newPayout,
    }))
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans">
      {/* 1. Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-slate-50/70 to-slate-50 border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003D5C] via-[#009D9E] to-cyan-400" />

        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#003D5C] to-[#002233] text-cyan-300 flex items-center justify-center shadow-md shadow-[#003D5C]/20 shrink-0 border border-cyan-500/20">
            <FileSpreadsheet className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#003D5C] tracking-tight font-['Geist']">
                Agents Commission & Payouts Ledger
              </h1>
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-900 border border-cyan-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                <span className="size-1.5 rounded-full bg-cyan-600" />
                AIMT Entity
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Live student fee tracking, formula-based commission calculation, and agent payout balance management.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={isLoading}
            className="border-slate-300/90 bg-white text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 h-9.5 px-3.5 rounded-xl text-xs gap-2 shadow-2xs font-semibold cursor-pointer transition-all"
            title="Refresh data"
          >
            <RotateCcw className={`size-3.5 text-[#009D9E] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/reports/commissions/settings">
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-300/80 bg-cyan-50/70 text-[#003D5C] hover:bg-cyan-100/70 h-9.5 px-3.5 rounded-xl text-xs gap-1.5 font-bold cursor-pointer"
            >
              <Settings className="size-3.5 text-[#009D9E]" />
              <span>Commission Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Creative & Vibrant KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Student Fee Paid (Deep Navy + Cyan Glow) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001724] via-[#002b40] to-[#003D5C] p-5 text-white shadow-md border border-cyan-500/20 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-cyan-500/10 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/80 bg-white/10 px-2 py-0.5 rounded-md">
                Student Fees
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Fee Paid across {stats.totalStudents} Students
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-[#81F5F5] flex items-center justify-center shadow-inner">
              <Users className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-[#81F5F5]">
            <span>Enrolled Under Agencies</span>
            <span className="font-bold">{stats.totalStudents} Active</span>
          </div>
        </div>

        {/* Card 2: Total Commission Payable (Vibrant Emerald / Teal) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#004D40] via-[#00695C] to-[#00897B] p-5 text-white shadow-md border border-teal-400/30 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-teal-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-200 bg-white/15 px-2 py-0.5 rounded-md">
                Total Payable
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-teal-100 font-medium mt-1">
                Calculated Commission Liability
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner">
              <Calculator className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-100">
            <span>By % & Flat Rules</span>
            <span className="font-bold">Auto-Calculated</span>
          </div>
        </div>

        {/* Card 3: Total Commission Paid to Agents (Royal Electric Indigo) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#312E81] via-[#4338CA] to-[#6366F1] p-5 text-white shadow-md border border-indigo-400/30 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-indigo-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200 bg-white/15 px-2 py-0.5 rounded-md">
                Paid to Agents
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-indigo-100 font-medium mt-1">
                Disbursed Payouts Recorded
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner">
              <CheckCircle2 className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-indigo-100">
            <span>Payouts Completed</span>
            <span className="font-bold">
              {stats.totalPayable > 0 ? Math.round((stats.totalPaid / stats.totalPayable) * 100) : 0}% Paid
            </span>
          </div>
        </div>

        {/* Card 4: Outstanding Balance Due (Sunset Flame Amber / Orange) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C2D12] via-[#C2410C] to-[#EA580C] p-5 text-white shadow-md border border-orange-400/30 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-orange-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-200 bg-white/15 px-2 py-0.5 rounded-md">
                Outstanding Balance
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-orange-100 font-medium mt-1">
                Pending Agent Disbursements
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner">
              <Clock className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-orange-100">
            <span>Payable - Paid</span>
            <span className="font-bold">Due for Payout</span>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 pr-4 h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white transition-colors"
            />
          </div>

          {/* Agent Filter Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[240px]">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full h-10 pl-3 pr-8 text-xs font-semibold bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All Agencies ({PREDEFINED_AGENTS.length})</option>
                {PREDEFINED_AGENTS.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#003D5C] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('full')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'full'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Full Paid
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('partial')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'partial'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Partial
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unpaid')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'unpaid'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                Unpaid
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('no-rule')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'no-rule'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                No Rule
              </button>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-700">{filteredRows.length}</span> student records under agencies
        </div>
      </div>

      {/* 4. Main Commission Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="size-8 text-[#009D9E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Calculating agent commissions...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="size-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No records found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or agency selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#001E2F] text-white border-b border-white/10 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center text-slate-400">#</th>
                  <th className="py-3.5 px-4">Student Name & ID</th>
                  <th className="py-3.5 px-4">Admission Agency</th>
                  <th className="py-3.5 px-4 font-mono">Fee Paid ($ AUD)</th>
                  <th className="py-3.5 px-4">Commission Rule</th>
                  <th className="py-3.5 px-4 font-mono text-[#81F5F5]">Payable ($ AUD)</th>
                  <th className="py-3.5 px-4 font-mono text-emerald-300">Paid to Agent</th>
                  <th className="py-3.5 px-4 font-mono text-amber-300">Balance Due</th>
                  <th className="py-3.5 px-4">Payout Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRows.map((row, index) => {
                  const student = row.record
                  const rule = row.rule
                  const isConfigured = !!rule

                  const initials = (student.student_name || 'ST')
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Student Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[11px] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {student.student_name}
                            </div>
                            <div className="text-[11px] font-mono font-semibold text-slate-400">
                              {student.student_id || 'ID N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Agency Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {student.agent}
                        </div>
                        {rule ? (
                          <div className="text-[10px] text-teal-700 font-medium">
                            {rule.type === 'percentage' ? `${rule.rate}% Rate` : `$${rule.rate} Fixed`}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-600 font-medium">
                            No Rule Set
                          </div>
                        )}
                      </td>

                      {/* Student Fee Paid */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        ${row.feePaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Commission Rule / Formula */}
                      <td className="py-3.5 px-4">
                        {rule ? (
                          rule.type === 'percentage' ? (
                            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              <Percent className="size-3 text-teal-600" />
                              {rule.rate}% of Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              <DollarSign className="size-3 text-indigo-600" />
                              ${rule.rate.toLocaleString()} Flat
                            </span>
                          )
                        ) : (
                          <Link href="/reports/commissions/settings" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:underline">
                            <AlertCircle className="size-3 text-amber-500" />
                            <span>Configure Rule</span>
                          </Link>
                        )}
                      </td>

                      {/* Commission Payable */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-[#003D5C] text-sm">
                        ${row.commissionPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Paid to Agent */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-sm">
                        ${row.commissionPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 text-sm">
                        ${row.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Payout Status Badge */}
                      <td className="py-3.5 px-4">
                        {row.status === 'full' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            Paid in Full
                          </span>
                        ) : row.status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <Clock className="size-3 text-amber-600" />
                            Partial Paid
                          </span>
                        ) : row.status === 'unpaid' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <AlertCircle className="size-3 text-rose-600" />
                            Unpaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                            No Rule
                          </span>
                        )}
                      </td>

                      {/* Action: Update Payout */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPayout(row)}
                          className="h-8 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition-all"
                        >
                          <Receipt className="size-3 text-[#009D9E]" />
                          <span>Update Payout</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Update Payout Modal */}
      <RecordPayoutModal
        open={isPayoutModalOpen}
        onOpenChange={setIsPayoutModalOpen}
        studentData={payoutModalStudent}
        onSaved={handleSavedPayout}
      />
    </div>
  )
}

