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
  ChevronDown,
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
  Wallet,
  ChevronUp,
  FolderOpen,
  Folder,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RecordPayoutModal from '@/components/reports/commissions/record-payout-modal'
import RecordAgencyPayoutModal from '@/components/reports/commissions/record-agency-payout-modal'
import type { AimtReportRecord } from '@/types/database.types'
import type { AgentCommissionRule } from '@/lib/services/agent-commission.service'
import type { StudentCommissionPayout, AgencyPayoutLog } from '@/lib/services/agent-payout.service'
import { PREDEFINED_AGENTS } from '@/lib/constants/aimt-agents'

export default function AgentCommissionsPage() {
  const [records, setRecords] = useState<AimtReportRecord[]>([])
  const [rules, setRules] = useState<Record<string, AgentCommissionRule>>({})
  const [payouts, setPayouts] = useState<Record<string, StudentCommissionPayout>>({})
  const [isLoading, setIsLoading] = useState(true)

  // View Mode: 'grouped' (Agency Accordion List) vs 'flat' (Individual Student Flat Table)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')

  // Expanded state for agency accordions
  const [expandedAgencies, setExpandedAgencies] = useState<Record<string, boolean>>({})

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'full' | 'partial' | 'unpaid' | 'no-rule'>('all')

  // Selected student for individual payout modal
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

  // Selected agency for bulk payout modal
  const [agencyPayoutModalData, setAgencyPayoutModalData] = useState<{
    agentName: string
    studentsCount: number
    totalPayable: number
    totalPaid: number
    balanceDue: number
    students: Array<{
      recordId: string
      studentId?: string | null
      studentName?: string
      payable: number
      currentlyPaid: number
    }>
  } | null>(null)
  const [isAgencyPayoutModalOpen, setIsAgencyPayoutModalOpen] = useState(false)

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

  // Helper to extract fee paid by student - PRIORITY is strictly "Total Paid ($)"
  const getFeePaid = useCallback((r: AimtReportRecord): number => {
    const tpRaw = (r as any).total_paid ?? (r.extra_data as any)?.total_paid
    if (tpRaw !== undefined && tpRaw !== null && tpRaw !== '') {
      const tpNum = typeof tpRaw === 'number' ? tpRaw : parseFloat(String(tpRaw).replace(/[^0-9.-]+/g, ''))
      if (!isNaN(tpNum) && tpNum >= 0) {
        return tpNum
      }
    }

    const total = Number(r.total_fee) || 0
    const pending = Number(r.pending_amount) || 0
    const yet =
      typeof r.yet_to_raised === 'number'
        ? r.yet_to_raised
        : parseFloat(String(r.yet_to_raised || '0').replace(/[^0-9.-]+/g, '')) || 0
    if (total > 0 && (pending > 0 || yet > 0)) {
      const calc = Math.max(0, Math.round((total - (pending + yet)) * 100) / 100)
      if (calc > 0) return calc
    }

    if (typeof r.paid_amount === 'number' && r.paid_amount > 0) return r.paid_amount
    if (typeof (r as any).initial_payment === 'number' && (r as any).initial_payment > 0) return (r as any).initial_payment

    return 0
  }, [])

  // Canonicalize agent name against predefined list to prevent duplicate groupings like uppercase variations
  const canonicalizeAgent = useCallback((agentName?: string | null): string => {
    if (!agentName) return 'Unknown Agency'
    const cleaned = agentName.trim().replace(/\s+/g, ' ')
    if (!cleaned || cleaned === '-') return 'Unknown Agency'

    const matched = PREDEFINED_AGENTS.find(
      (p) => p.toLowerCase() === cleaned.toLowerCase()
    )
    return matched || cleaned
  }, [])

  // Helper to find configured rule for an agent name (with trimmed fuzzy fallback)
  const getRuleForAgent = useCallback(
    (agentName?: string | null): AgentCommissionRule | null => {
      if (!agentName) return null
      const canonical = canonicalizeAgent(agentName)
      if (rules[canonical]) return rules[canonical]

      const trimmed = agentName.trim()
      if (rules[trimmed]) return rules[trimmed]

      const foundKey = Object.keys(rules).find(
        (k) => k.toLowerCase() === trimmed.toLowerCase() || k.toLowerCase() === canonical.toLowerCase()
      )
      return foundKey ? rules[foundKey] : null
    },
    [rules, canonicalizeAgent]
  )

  // Compute calculated commission rows for all records
  // Only records marked as eligible_for_commission (or with previous payouts recorded) are calculated & displayed
  const calculatedRows = useMemo(() => {
    return records
      .filter((r) => {
        if (!r.agent || r.agent.trim() === '' || r.agent.trim() === '-') return false
        const hasPayoutRecorded = Boolean(payouts[r.id] && payouts[r.id].commissionPaid > 0)
        const isEligible = Boolean(r.eligible_for_commission || (r.extra_data as any)?.eligible_for_commission)
        return isEligible || hasPayoutRecorded
      })
      .map((record) => {
        const canonicalAgent = canonicalizeAgent(record.agent)
        const feePaid = getFeePaid(record)
        const courseFee = Number(record.total_fee) || 0
        const rule = getRuleForAgent(canonicalAgent)
        const payout = payouts[record.id]
        const commissionPaid = payout?.commissionPaid ?? 0

        let commissionPayable = 0
        if (rule) {
          if (rule.type === 'percentage') {
            commissionPayable = Math.round(((feePaid * rule.rate) / 100) * 100) / 100
          } else if (rule.type === 'fixed') {
            commissionPayable = rule.rate
          } else if (rule.type === 'net_remainder') {
            // Net Remainder: Total Course Fee minus College Retained Share
            commissionPayable = Math.max(0, Math.round((courseFee - rule.rate) * 100) / 100)
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
          canonicalAgent,
          feePaid,
          courseFee,
          rule,
          commissionPayable,
          commissionPaid,
          balanceDue,
          status,
          payout,
        }
      })
  }, [records, getFeePaid, getRuleForAgent, canonicalizeAgent, payouts])

  // Group calculated rows by Agency / Agent
  const groupedAgencies = useMemo(() => {
    const map = new Map<string, typeof calculatedRows>()

    calculatedRows.forEach((row) => {
      const agent = row.canonicalAgent || 'Unknown Agency'
      if (!map.has(agent)) {
        map.set(agent, [])
      }
      map.get(agent)!.push(row)
    })

    const groups = Array.from(map.entries()).map(([agentName, students]) => {
      const rule = getRuleForAgent(agentName)
      let totalCourseFee = 0
      let totalFeePaid = 0
      let totalPayable = 0
      let totalPaid = 0

      students.forEach((s) => {
        totalCourseFee += s.courseFee
        totalFeePaid += s.feePaid
        totalPayable += s.commissionPayable
        totalPaid += s.commissionPaid
      })

      const balanceDue = Math.max(0, Math.round((totalPayable - totalPaid) * 100) / 100)

      let status: 'full' | 'partial' | 'unpaid' | 'no-rule' = 'no-rule'
      if (rule) {
        if (totalPayable > 0 && totalPaid >= totalPayable) {
          status = 'full'
        } else if (totalPaid > 0) {
          status = 'partial'
        } else {
          status = 'unpaid'
        }
      }

      return {
        agentName,
        rule,
        students,
        totalCourseFee: Math.round(totalCourseFee * 100) / 100,
        totalFeePaid: Math.round(totalFeePaid * 100) / 100,
        totalPayable: Math.round(totalPayable * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        balanceDue,
        status,
      }
    })

    // Sort by student count descending, then name
    return groups.sort((a, b) => b.students.length - a.students.length || a.agentName.localeCompare(b.agentName))
  }, [calculatedRows, getRuleForAgent])

  // Filtered Agencies based on search, dropdown, status
  const filteredAgencies = useMemo(() => {
    return groupedAgencies.filter((agency) => {
      if (selectedAgent !== 'all') {
        if (agency.agentName.toLowerCase().trim() !== selectedAgent.toLowerCase().trim()) {
          return false
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const agentMatch = agency.agentName.toLowerCase().includes(query)
        const studentMatch = agency.students.some(
          (s) =>
            (s.record.student_name || '').toLowerCase().includes(query) ||
            (s.record.student_id || '').toLowerCase().includes(query)
        )
        if (!agentMatch && !studentMatch) return false
      }

      if (statusFilter !== 'all') {
        if (agency.status !== statusFilter) return false
      }

      return true
    })
  }, [groupedAgencies, selectedAgent, searchQuery, statusFilter])

  // Filtered Individual Student Rows (for flat view & KPI calculation)
  const filteredRows = useMemo(() => {
    return calculatedRows.filter((row) => {
      if (selectedAgent !== 'all') {
        const agent = (row.canonicalAgent || row.record.agent || '').toLowerCase().trim()
        if (agent !== selectedAgent.toLowerCase().trim()) return false
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const nameMatch = (row.record.student_name || '').toLowerCase().includes(query)
        const idMatch = (row.record.student_id || '').toLowerCase().includes(query)
        const agentMatch = (row.canonicalAgent || row.record.agent || '').toLowerCase().includes(query)
        if (!nameMatch && !idMatch && !agentMatch) return false
      }

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
      totalAgencies: filteredAgencies.length,
      totalFee: Math.round(totalFee * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalBalance: Math.round(totalBalance * 100) / 100,
    }
  }, [filteredRows, filteredAgencies])

  // Accordion toggle handlers
  const toggleAgency = (agentName: string) => {
    setExpandedAgencies((prev) => ({
      ...prev,
      [agentName]: !prev[agentName],
    }))
  }

  const expandAll = () => {
    const next: Record<string, boolean> = {}
    filteredAgencies.forEach((g) => {
      next[g.agentName] = true
    })
    setExpandedAgencies(next)
  }

  const collapseAll = () => {
    setExpandedAgencies({})
  }

  // Open single student payout modal
  const handleOpenStudentPayout = (row: (typeof calculatedRows)[0]) => {
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

  // Open agency bulk payout modal
  const handleOpenAgencyPayout = (agency: (typeof groupedAgencies)[0]) => {
    setAgencyPayoutModalData({
      agentName: agency.agentName,
      studentsCount: agency.students.length,
      totalPayable: agency.totalPayable,
      totalPaid: agency.totalPaid,
      balanceDue: agency.balanceDue,
      students: agency.students.map((s) => ({
        recordId: s.record.id,
        studentId: s.record.student_id,
        studentName: s.record.student_name,
        payable: s.commissionPayable,
        currentlyPaid: s.commissionPaid,
      })),
    })
    setIsAgencyPayoutModalOpen(true)
  }

  const handleSavedStudentPayout = (newPayout: StudentCommissionPayout) => {
    setPayouts((prev) => ({
      ...prev,
      [newPayout.recordId]: newPayout,
    }))
  }

  const handleSavedAgencyPayout = (
    updatedPayouts: Record<string, StudentCommissionPayout>,
    payoutLog?: AgencyPayoutLog
  ) => {
    setPayouts(updatedPayouts)
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
              Agency-grouped student records, automated commission calculation formulas, and one-click bulk payouts.
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

      {/* 2. Vibrant KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Student Fee Paid */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001724] via-[#002b40] to-[#003D5C] p-5 text-white shadow-md border border-cyan-500/20 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-cyan-500/10 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                Student Fees Paid
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.totalFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-cyan-100 font-medium mt-1">
                Fee Paid across {stats.totalStudents} Students
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-cyan-300 flex items-center justify-center shadow-inner">
              <Users className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-cyan-100/80">
            <span>Enrolled Under Agencies</span>
            <span className="font-bold text-cyan-300">{stats.totalAgencies} Active Agencies</span>
          </div>
        </div>

        {/* Card 2: Total Commission Payable */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#004d40] via-[#00695c] to-[#00897b] p-5 text-white shadow-md border border-teal-400/20 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-emerald-400/10 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
                Total Payable
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-2 font-mono">
                ${stats.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-teal-100 font-medium mt-1">
                Calculated Commission Liability
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-emerald-200 flex items-center justify-center shadow-inner">
              <Calculator className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-100">
            <span>Formulas: % / Fixed / Remainder</span>
            <span className="font-bold">Auto-Calculated</span>
          </div>
        </div>

        {/* Card 3: Paid to Agents */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#283593] via-[#3949ab] to-[#5c6bc0] p-5 text-white shadow-md border border-indigo-400/20 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-indigo-300/10 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
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

        {/* Card 4: Outstanding Balance Due */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#bf360c] via-[#d84315] to-[#f4511e] p-5 text-white shadow-md border border-orange-400/20 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-orange-300/10 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-200 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
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

      {/* 3. Controls, View Mode Switcher, and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: View Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-[#003D5C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Building2 className="size-3.5" />
              <span>Grouped by Agency</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                {filteredAgencies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-[#003D5C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Users className="size-3.5" />
              <span>All Students View</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                {filteredRows.length}
              </span>
            </button>
          </div>

          {/* Right: Expand / Collapse All (in grouped view) */}
          {viewMode === 'grouped' && filteredAgencies.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="h-8 px-2.5 text-xs text-slate-700 font-semibold gap-1 border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <FolderOpen className="size-3.5 text-[#009D9E]" />
                <span>Expand All ({filteredAgencies.length})</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="h-8 px-2.5 text-xs text-slate-700 font-semibold gap-1 border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <Folder className="size-3.5 text-slate-500" />
                <span>Collapse All</span>
              </Button>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by agency, student name, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 pr-4 h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white transition-colors"
            />
          </div>

          {/* Agency Filter Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[220px]">
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
            <div className="flex items-center gap-1 flex-wrap">
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

        <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
          <span>
            Showing <strong className="text-slate-800">{filteredAgencies.length}</strong> agencies with <strong className="text-slate-800">{filteredRows.length}</strong> enrolled students.
          </span>
          {viewMode === 'grouped' && (
            <span className="text-cyan-700 font-semibold hidden sm:inline">
              Click any agency row or dropdown icon to expand its students list.
            </span>
          )}
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Loader2 className="size-8 text-[#009D9E] animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Calculating agent commissions & grouping entries...</p>
        </div>
      ) : filteredAgencies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <AlertCircle className="size-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No records found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or agency selection.</p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* ======================================================== */
        /* VIEW 1: GROUPED BY AGENCY ACCORDIONS (USER REQUESTED)    */
        /* ======================================================== */
        <div className="space-y-3">
          {filteredAgencies.map((agency) => {
            const isExpanded = Boolean(expandedAgencies[agency.agentName])
            const rule = agency.rule
            const initials = agency.agentName
              .split(' ')
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase()

            return (
              <div
                key={agency.agentName}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                {/* Agency Row Header */}
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40 border-b border-slate-100 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Accordion Dropdown Trigger + Agency Avatar + Agency Name + Rule badge */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Expand/Collapse Dropdown Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleAgency(agency.agentName)}
                      className="size-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
                      title={isExpanded ? 'Collapse students' : 'Expand students'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-[#009D9E] stroke-[2.5]" />
                      ) : (
                        <ChevronRight className="size-4 text-slate-500 stroke-[2.5]" />
                      )}
                    </button>

                    {/* Agency Avatar */}
                    <div className="size-9 sm:size-10 rounded-xl bg-gradient-to-br from-[#003D5C] to-[#002233] text-cyan-300 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs border border-cyan-500/20">
                      {initials || 'AG'}
                    </div>

                    {/* Agency Title & Meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          onClick={() => toggleAgency(agency.agentName)}
                          className="font-extrabold text-slate-900 text-sm sm:text-base hover:text-[#003D5C] cursor-pointer truncate"
                          title={agency.agentName}
                        >
                          {agency.agentName}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                          {agency.students.length} Student{agency.students.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Rule Badge */}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {rule ? (
                          rule.type === 'percentage' ? (
                            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                              <Percent className="size-3 text-teal-600" />
                              {rule.rate}% of Paid Fee
                            </span>
                          ) : rule.type === 'fixed' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                              <DollarSign className="size-3 text-blue-600" />
                              ${rule.rate.toLocaleString()} Flat / Student
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                              <Building2 className="size-3 text-amber-600" />
                              Fee - ${rule.rate.toLocaleString()} College Base
                            </span>
                          )
                        ) : (
                          <Link
                            href="/reports/commissions/settings"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md hover:underline"
                          >
                            <AlertCircle className="size-3 text-amber-600" />
                            <span>Rule Not Set (Configure)</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics & Actions - Responsive Grid/Flex in single line */}
                  <div className="flex flex-wrap lg:flex-nowrap items-center justify-between 2xl:justify-end gap-2.5 sm:gap-3.5 pt-2.5 2xl:pt-0 border-t 2xl:border-t-0 border-slate-100">
                    {/* Total Course Fee (Sum of student total_fee) */}
                    <div className="text-left sm:text-right bg-slate-50/90 px-2 py-1 rounded-lg border border-slate-200/70 shrink-0">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Total Courses Fee
                      </div>
                      <div className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                        ${agency.totalCourseFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Student Fees Paid */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Student Fee Paid
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                        ${agency.totalFeePaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Payable */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#009D9E]">
                        Commission Payable
                      </div>
                      <div className="font-mono font-black text-[#003D5C] text-xs sm:text-sm">
                        ${agency.totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Paid */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        Paid to Agency
                      </div>
                      <div className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                        ${agency.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        Balance Due
                      </div>
                      <div className="font-mono font-extrabold text-amber-700 text-xs sm:text-sm">
                        ${agency.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {agency.status === 'full' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Paid
                        </span>
                      ) : agency.status === 'partial' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap">
                          <Clock className="size-3 text-amber-600" />
                          Partial
                        </span>
                      ) : agency.status === 'unpaid' ? (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap">
                          <AlertCircle className="size-3 text-rose-600" />
                          Unpaid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap">
                          No Rule
                        </span>
                      )}
                    </div>

                    {/* Primary Button: Disburse Agency Payout */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenAgencyPayout(agency)}
                      className="bg-[#003D5C] hover:bg-[#002b40] text-cyan-200 font-bold h-8.5 px-3 rounded-xl text-xs gap-1.5 cursor-pointer shadow-xs border border-cyan-500/20 shrink-0"
                    >
                      <Wallet className="size-3.5 text-cyan-300" />
                      <span>Disburse Payout</span>
                    </Button>
                  </div>
                </div>

                {/* Expanded Sub-Table: Students of this agency */}
                {isExpanded && (
                  <div className="bg-slate-50/60 p-3 sm:p-4 border-t border-slate-200/80 animate-in fade-in-50 duration-150">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/90 text-slate-600 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider">
                              <th className="py-2.5 px-3 w-10 text-center">#</th>
                              <th className="py-2.5 px-3">Student Name & ID</th>
                              <th className="py-2.5 px-3">Enrolled Course</th>
                              <th className="py-2.5 px-3 font-mono">Course Fee</th>
                              <th className="py-2.5 px-3 font-mono text-slate-800">Fee Paid ($ AUD)</th>
                              <th className="py-2.5 px-3 font-mono text-[#003D5C]">Payable ($)</th>
                              <th className="py-2.5 px-3 font-mono text-emerald-700">Paid to Agent</th>
                              <th className="py-2.5 px-3 font-mono text-amber-700">Balance Due</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Student Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {agency.students.map((studentRow, sIdx) => {
                              const st = studentRow.record
                              const stInitials = (st.student_name || 'ST')
                                .split(' ')
                                .map((w) => w[0])
                                .filter(Boolean)
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()

                              return (
                                <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                                    {sIdx + 1}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <div className="size-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px] shrink-0">
                                        {stInitials}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 text-xs">
                                          {st.student_name}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-400">
                                          {st.student_id || 'ID N/A'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[200px] truncate" title={st.course || ''}>
                                    {st.course || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                                    ${studentRow.courseFee.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-xs">
                                    ${studentRow.feePaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-extrabold text-[#003D5C] text-xs">
                                    ${studentRow.commissionPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-xs">
                                    ${studentRow.commissionPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-amber-700 text-xs">
                                    ${studentRow.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {studentRow.status === 'full' ? (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <CheckCircle2 className="size-2.5 text-emerald-600" />
                                        Full Paid
                                      </span>
                                    ) : studentRow.status === 'partial' ? (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <Clock className="size-2.5 text-amber-600" />
                                        Partial
                                      </span>
                                    ) : studentRow.status === 'unpaid' ? (
                                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <AlertCircle className="size-2.5 text-rose-600" />
                                        Unpaid
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        No Rule
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenStudentPayout(studentRow)}
                                      className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                                      title="Update individual student payout"
                                    >
                                      <Receipt className="size-3 text-[#009D9E]" />
                                      <span>Edit</span>
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ======================================================== */
        /* VIEW 2: FLAT ALL STUDENTS TABLE                         */
        /* ======================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
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
                  const initials = (student.student_name || 'ST')
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>
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
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {student.agent}
                        </div>
                        {rule ? (
                          <div className="text-[10px] text-teal-700 font-medium">
                            {rule.type === 'percentage'
                              ? `${rule.rate}% Rate`
                              : rule.type === 'fixed'
                              ? `$${rule.rate} Fixed`
                              : `Course Fee - $${rule.rate} College`}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-600 font-medium">No Rule Set</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        ${row.feePaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        {rule ? (
                          rule.type === 'percentage' ? (
                            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              <Percent className="size-3 text-teal-600" />
                              {rule.rate}% of Paid
                            </span>
                          ) : rule.type === 'fixed' ? (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              <DollarSign className="size-3 text-blue-600" />
                              ${rule.rate.toLocaleString()} Flat
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold">
                              <Building2 className="size-3 text-amber-600" />
                              Fee - ${rule.rate.toLocaleString()}
                            </span>
                          )
                        ) : (
                          <Link href="/reports/commissions/settings" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:underline">
                            <AlertCircle className="size-3 text-amber-500" />
                            <span>Configure Rule</span>
                          </Link>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-[#003D5C] text-sm">
                        ${row.commissionPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-sm">
                        ${row.commissionPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 text-sm">
                        ${row.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
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
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStudentPayout(row)}
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
        </div>
      )}

      {/* 5. Update Single Student Payout Modal */}
      <RecordPayoutModal
        open={isPayoutModalOpen}
        onOpenChange={setIsPayoutModalOpen}
        studentData={payoutModalStudent}
        onSaved={handleSavedStudentPayout}
      />

      {/* 6. Disburse Bulk Agency Payout Modal */}
      <RecordAgencyPayoutModal
        open={isAgencyPayoutModalOpen}
        onOpenChange={setIsAgencyPayoutModalOpen}
        agencyData={agencyPayoutModalData}
        onSaved={handleSavedAgencyPayout}
      />
    </div>
  )
}
