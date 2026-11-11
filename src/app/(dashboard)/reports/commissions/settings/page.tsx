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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ConfigureCommissionModal from '@/components/reports/commissions/configure-commission-modal'
import type { AgentCommissionRule } from '@/lib/services/agent-commission.service'
import { PREDEFINED_AGENTS } from '@/lib/constants/aimt-agents'

export default function AgentCommissionSettingsPage() {
  const [agents, setAgents] = useState<string[]>(PREDEFINED_AGENTS)
  const [rules, setRules] = useState<Record<string, AgentCommissionRule>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'configured' | 'percentage' | 'fixed' | 'net_remainder' | 'unconfigured'>('all')

  // Selected agent for configuration modal
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch commission settings from API
  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/reports/commissions/settings')
      const data = await res.json()
      if (data.success) {
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          setAgents(data.agents)
        }
        if (data.rules) {
          setRules(data.rules)
        }
      }
    } catch (err) {
      console.error('Failed to fetch commission settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Overview Metrics
  const stats = useMemo(() => {
    const total = agents.length
    let percentageCount = 0
    let fixedCount = 0
    let remainderCount = 0
    let configuredCount = 0

    agents.forEach((agent) => {
      const rule = rules[agent]
      if (rule) {
        configuredCount++
        if (rule.type === 'percentage') percentageCount++
        if (rule.type === 'fixed') fixedCount++
        if (rule.type === 'net_remainder') remainderCount++
      }
    })

    const unconfiguredCount = total - configuredCount

    return {
      total,
      percentageCount,
      fixedCount,
      remainderCount,
      configuredCount,
      unconfiguredCount,
    }
  }, [agents, rules])

  // Filtered list based on search and status
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch = agent.toLowerCase().includes(searchQuery.trim().toLowerCase())
      if (!matchesSearch) return false

      const rule = rules[agent]

      if (activeFilter === 'configured') return !!rule
      if (activeFilter === 'percentage') return rule?.type === 'percentage'
      if (activeFilter === 'fixed') return rule?.type === 'fixed'
      if (activeFilter === 'net_remainder') return rule?.type === 'net_remainder'
      if (activeFilter === 'unconfigured') return !rule
      return true
    })
  }, [agents, rules, searchQuery, activeFilter])

  // Handlers for modal
  const handleOpenConfig = (agent: string) => {
    setSelectedAgent(agent)
    setIsModalOpen(true)
  }

  const handleSavedRule = (updatedRule: AgentCommissionRule) => {
    setRules((prev) => ({
      ...prev,
      [updatedRule.agentName]: updatedRule,
    }))
  }

  const handleDeletedRule = (agentName: string) => {
    setRules((prev) => {
      const next = { ...prev }
      delete next[agentName]
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-14 font-sans">
      {/* 1. Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-slate-50/70 to-slate-50 border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003D5C] via-[#009D9E] to-cyan-400" />

        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#003D5C] to-[#002233] text-cyan-300 flex items-center justify-center shadow-md shadow-[#003D5C]/20 shrink-0 border border-cyan-500/20">
            <BadgePercent className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#003D5C] tracking-tight font-['Geist']">
                Agents Commission Settings
              </h1>
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-900 border border-cyan-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                <span className="size-1.5 rounded-full bg-cyan-600" />
                AIMT Entity
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Configure commission structure (Percentage % of Fee Paid or Flat Fixed $ AUD) per agency for automated student commission calculations.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSettings()}
            disabled={isLoading}
            className="border-slate-300/90 bg-white text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 h-9.5 px-3.5 rounded-xl text-xs gap-2 shadow-2xs font-semibold cursor-pointer transition-all"
            title="Refresh settings"
          >
            <RotateCcw className={`size-3.5 text-[#009D9E] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/reports/commissions">
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#003D5C] to-[#002233] text-[#81F5F5] hover:from-[#00283d] hover:to-[#001724] h-9.5 px-4 rounded-xl text-xs gap-1.5 font-bold cursor-pointer shadow-sm border border-cyan-500/20"
            >
              <FileSpreadsheet className="size-3.5 text-[#81F5F5]" />
              <span>View Commissions Ledger</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Creative & Vibrant KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered Agencies (Deep Navy + Cyan Glow) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001724] via-[#002b40] to-[#003D5C] p-5 text-white shadow-md border border-cyan-500/20 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-cyan-500/10 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#81F5F5]/80 bg-white/10 px-2 py-0.5 rounded-md">
                Master Roster
              </span>
              <h3 className="text-3xl font-black tracking-tight text-white mt-2">
                {stats.total}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Total Predefined Agencies
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-[#81F5F5] flex items-center justify-center shadow-inner">
              <Building2 className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-[#81F5F5]">
            <span>Configured: {stats.configuredCount} / {stats.total}</span>
            <span className="font-bold">
              {stats.total > 0 ? Math.round((stats.configuredCount / stats.total) * 100) : 0}% Active
            </span>
          </div>
        </div>

        {/* Card 2: Percentage Rules (Vibrant Emerald / Cyan) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#004D40] via-[#00695C] to-[#00897B] p-5 text-white shadow-md border border-teal-400/30 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-teal-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-200 bg-white/15 px-2 py-0.5 rounded-md">
                Percentage Model
              </span>
              <h3 className="text-3xl font-black tracking-tight text-white mt-2">
                {stats.percentageCount}
              </h3>
              <p className="text-xs text-teal-100 font-medium mt-1">
                Calculated on Fee Paid
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner">
              <Percent className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-100">
            <span>Formula: Fee Paid × %</span>
            <span className="font-bold">Auto-calculated</span>
          </div>
        </div>

        {/* Card 3: Fixed Amount Rules (Electric Royal Indigo / Violet) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#312E81] via-[#4338CA] to-[#6366F1] p-5 text-white shadow-md border border-indigo-400/30 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-indigo-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200 bg-white/15 px-2 py-0.5 rounded-md">
                Fixed Model
              </span>
              <h3 className="text-3xl font-black tracking-tight text-white mt-2">
                {stats.fixedCount}
              </h3>
              <p className="text-xs text-indigo-100 font-medium mt-1">
                Flat AUD per Student
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner">
              <DollarSign className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-indigo-100">
            <span>Formula: Flat $ AUD</span>
            <span className="font-bold">Per Student</span>
          </div>
        </div>

        {/* Card 4: Pending Configuration (Sunset Flame Amber / Orange) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C2D12] via-[#C2410C] to-[#EA580C] p-5 text-white shadow-md border border-orange-400/30 group">
          <div className="absolute -right-6 -bottom-6 size-28 rounded-full bg-orange-300/20 blur-xl group-hover:scale-125 transition-transform duration-500" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-200 bg-white/15 px-2 py-0.5 rounded-md">
                Action Required
              </span>
              <h3 className="text-3xl font-black tracking-tight text-white mt-2">
                {stats.unconfiguredCount}
              </h3>
              <p className="text-xs text-orange-100 font-medium mt-1">
                Pending Setup
              </p>
            </div>
            <div className="size-12 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white flex items-center justify-center shadow-inner">
              <AlertCircle className="size-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-orange-100">
            <span>Awaiting rule setup</span>
            <span className="font-bold">Not Configured</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search agency by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 pr-4 h-10 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#003D5C] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('configured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'configured'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Configured ({stats.configuredCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('percentage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'percentage'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              Percentage ({stats.percentageCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('fixed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'fixed'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              Fixed ({stats.fixedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('net_remainder')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'net_remainder'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              Remainder ({stats.remainderCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unconfigured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'unconfigured'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Pending ({stats.unconfiguredCount})
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-700">{filteredAgents.length}</span> of {agents.length} agencies
        </div>
      </div>

      {/* 4. Professional List-Wise Table (NO BOXES) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="size-8 text-[#009D9E] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading commission settings...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="size-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No agencies match your criteria</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or changing filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Agency / Admission Partner</th>
                  <th className="py-3.5 px-4">Commission Model</th>
                  <th className="py-3.5 px-4">Configured Rate</th>
                  <th className="py-3.5 px-4">Applied Formula</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAgents.map((agent, index) => {
                  const rule = rules[agent]
                  const isConfigured = !!rule
                  const isPercentage = rule?.type === 'percentage'
                  const isFixed = rule?.type === 'fixed'
                  const isRemainder = rule?.type === 'net_remainder'

                  const initials = agent
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <tr
                      key={agent}
                      onClick={() => handleOpenConfig(agent)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 group-hover:text-slate-600">
                        {index + 1}
                      </td>

                      {/* Agency Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-gradient-to-br from-[#003D5C]/10 to-[#009D9E]/10 border border-slate-200 flex items-center justify-center text-[#003D5C] font-extrabold text-xs shrink-0 group-hover:from-[#003D5C] group-hover:to-[#002233] group-hover:text-cyan-300 transition-all">
                            {initials || 'AG'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-[#003D5C] transition-colors text-sm">
                              {agent}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              AIMT Admission Partner
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Model Type */}
                      <td className="py-3.5 px-4">
                        {isConfigured ? (
                          isPercentage ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs">
                              <Percent className="size-3 text-teal-600" />
                              Percentage (%)
                            </span>
                          ) : isFixed ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs">
                              <DollarSign className="size-3 text-blue-600" />
                              Fixed ($ AUD)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs">
                              <Building2 className="size-3 text-amber-600" />
                              Net Remainder
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium text-xs">
                            Not Configured
                          </span>
                        )}
                      </td>

                      {/* Configured Rate */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {isConfigured ? (
                          isPercentage ? (
                            <span className="text-teal-700 text-sm">{rule.rate}%</span>
                          ) : isFixed ? (
                            <span className="text-blue-700 text-sm">${rule.rate.toLocaleString()} AUD</span>
                          ) : (
                            <span className="text-amber-800 text-sm">${rule.rate.toLocaleString()} Base</span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Applied Formula */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {isConfigured ? (
                          isPercentage ? (
                            <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200/60">
                              Fee Paid × <strong className="text-teal-700">{rule.rate}%</strong>
                            </span>
                          ) : isFixed ? (
                            <span className="text-blue-800 bg-blue-50/70 px-2 py-1 rounded-md border border-blue-200/80">
                              Flat <strong className="text-blue-700">${rule.rate.toLocaleString()} AUD</strong> / Student
                            </span>
                          ) : (
                            <span className="text-amber-950 bg-amber-50 px-2 py-1 rounded-md border border-amber-300/80">
                              Course Fee - <strong className="text-amber-700">${rule.rate.toLocaleString()}</strong> College
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Rule not set</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-xs">
                            <AlertCircle className="size-3.5 text-amber-600" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {rule?.updatedAt ? (
                          <span>{new Date(rule.updatedAt).toLocaleDateString()}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={isConfigured ? 'outline' : 'default'}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenConfig(agent)
                          }}
                          className={`h-8 px-3 rounded-lg text-xs font-bold gap-1.5 cursor-pointer transition-all ${
                            isConfigured
                              ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                              : 'bg-gradient-to-r from-[#003D5C] to-[#002233] text-cyan-300 hover:from-[#00283d] hover:to-[#001724] border border-cyan-500/20 shadow-2xs'
                          }`}
                        >
                          {isConfigured ? (
                            <>
                              <Edit className="size-3 text-slate-500" />
                              <span>Edit Rule</span>
                            </>
                          ) : (
                            <>
                              <SlidersHorizontal className="size-3 text-cyan-300" />
                              <span>Configure Rule</span>
                            </>
                          )}
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

      {/* 5. Configuration Modal */}
      <ConfigureCommissionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        agentName={selectedAgent}
        currentRule={selectedAgent ? rules[selectedAgent] : null}
        onSaved={handleSavedRule}
        onDeleted={handleDeletedRule}
      />
    </div>
  )
}
