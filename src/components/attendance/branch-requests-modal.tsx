'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Building2,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  X,
} from 'lucide-react'
import { AttendanceRequestItem } from '@/lib/services/attendance-requests.service'

interface BranchRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  onRecordUpdated?: () => void
}

export function BranchRequestsModal({ isOpen, onClose, onRecordUpdated }: BranchRequestsModalProps) {
  const [requests, setRequests] = useState<AttendanceRequestItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING')
  const [search, setSearch] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchRequests = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/attendance/requests')
      const data = await res.json()
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests)
      } else {
        setError(data.error || 'Failed to load branch requests.')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching requests.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (selectedBranch !== 'all' && r.branch.toLowerCase() !== selectedBranch.toLowerCase()) {
      return false
    }
    if (selectedStatus !== 'all' && r.status !== selectedStatus) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = (r.employee_name || '').toLowerCase()
      const batch = (r.batch_id || '').toLowerCase()
      const reason = (r.reason || '').toLowerCase()
      const type = (r.request_type || '').toLowerCase()
      if (!name.includes(q) && !batch.includes(q) && !reason.includes(q) && !type.includes(q)) {
        return false
      }
    }
    return true
  })

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  const handleApprove = async (req: AttendanceRequestItem) => {
    setActionInProgress(req.id)
    setError(null)
    try {
      const res = await fetch('/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          requestId: req.id,
          reviewedBy: 'Admin',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRequests((prev) =>
          prev.map((item) => (item.id === req.id ? { ...item, status: 'APPROVED' as const, reviewed_by: 'Admin' } : item))
        )
        if (onRecordUpdated) {
          onRecordUpdated()
        }
      } else {
        setError(data.error || 'Failed to approve request.')
      }
    } catch (err: any) {
      setError(err.message || 'Error executing approval.')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleReject = async (req: AttendanceRequestItem) => {
    setActionInProgress(req.id)
    setError(null)
    try {
      const res = await fetch('/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          requestId: req.id,
          reviewedBy: 'Admin',
          reviewNotes: rejectReason || 'Rejected by Admin',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setRequests((prev) =>
          prev.map((item) =>
            item.id === req.id
              ? {
                  ...item,
                  status: 'REJECTED' as const,
                  reviewed_by: 'Admin',
                  review_notes: rejectReason || 'Rejected by Admin',
                }
              : item
          )
        )
        setRejectingId(null)
        setRejectReason('')
      } else {
        setError(data.error || 'Failed to reject request.')
      }
    } catch (err: any) {
      setError(err.message || 'Error executing rejection.')
    } finally {
      setActionInProgress(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-2xl font-sans">
        {/* Header Section */}
        <DialogHeader className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-white via-slate-50/70 to-slate-50 dark:from-slate-900 dark:to-slate-900/90 space-y-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-11 rounded-2xl bg-gradient-to-br from-[#003D5C] to-[#002233] text-cyan-300 flex items-center justify-center shadow-md shadow-[#003D5C]/15 shrink-0 border border-cyan-500/20">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="text-lg font-extrabold text-[#003D5C] dark:text-white tracking-tight font-['Geist']">
                    Branch Attendance Requests
                  </DialogTitle>
                  {pendingCount > 0 && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                      {pendingCount} Pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                  Review and approve leave or timing regularization requests submitted by branch users
                </p>
              </div>
            </div>

            {/* Top Right Action Group */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRequests}
                disabled={isLoading}
                className="h-9 px-3.5 gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-300 bg-white hover:bg-slate-50 rounded-xl shadow-2xs cursor-pointer transition-all"
              >
                <RefreshCw className={`size-3.5 text-[#009D9E] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              <button
                onClick={onClose}
                className="size-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar with Polished Padding & Sizing */}
          <div className="bg-slate-100/80 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shadow-2xs">
            {/* Search Input (Flexible space) */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#009D9E]" />
              <Input
                placeholder="Search employee, batch, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 text-xs pl-10 pr-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs font-medium placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#009D9E]/30 focus-visible:border-[#009D9E]"
              />
            </div>

            {/* Branch Filter Dropdown (145px width for Lahore Branch / Branch: All) */}
            <div className="relative w-full sm:w-[145px] shrink-0">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full h-10 pl-3.5 pr-8 text-xs font-semibold rounded-xl appearance-none cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#009D9E]/30 shadow-2xs transition-all"
              >
                <option value="all">Branch: All</option>
                <option value="Lahore">Lahore Branch</option>
                <option value="Multan">Multan Branch</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter Dropdown (135px width for Pending Only / Status: All) */}
            <div className="relative w-full sm:w-[135px] shrink-0">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 pl-3.5 pr-8 text-xs font-semibold rounded-xl appearance-none cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#009D9E]/30 shadow-2xs transition-all"
              >
                <option value="all">Status: All</option>
                <option value="PENDING">Pending Only</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </DialogHeader>

        {/* Requests Scrollable List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50/40 dark:bg-slate-900/60">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3 shadow-2xs font-semibold">
              <AlertCircle className="size-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="size-8 animate-spin text-[#009D9E]" />
              <p className="text-xs font-bold text-slate-500">Loading branch requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 px-6 bg-white dark:bg-slate-800/80 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center text-slate-400 gap-3 shadow-2xs">
              <div className="size-14 rounded-2xl bg-cyan-50 dark:bg-slate-800 border border-cyan-200/80 flex items-center justify-center text-[#009D9E]">
                <FileText className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No requests found</p>
                <p className="text-xs text-slate-400 max-w-xs font-medium leading-relaxed">
                  {selectedStatus === 'PENDING'
                    ? 'There are currently no pending requests from branch users.'
                    : 'No requests match the selected branch and status filters.'}
                </p>
              </div>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isPending = req.status === 'PENDING'
              const isApproved = req.status === 'APPROVED'
              const isRejected = req.status === 'REJECTED'
              const isProcessing = actionInProgress === req.id

              return (
                <div
                  key={req.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-2xs hover:shadow-xs ${
                    isPending
                      ? 'bg-gradient-to-r from-amber-50/80 via-white to-amber-50/20 border-amber-200/90 dark:bg-amber-950/20 dark:border-amber-900/50 border-l-4 border-l-amber-500'
                      : isApproved
                      ? 'bg-gradient-to-r from-emerald-50/50 via-white to-white border-emerald-200/80 dark:bg-emerald-950/10 dark:border-emerald-900/40 border-l-4 border-l-emerald-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    {/* Left: Employee info & date */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                          {req.employee_name || 'Employee'}
                        </span>
                        {req.batch_id && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0.2 rounded border-slate-200 bg-slate-50 text-slate-600 font-bold">
                            {req.batch_id}
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            req.branch.toLowerCase().includes('lahore')
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-purple-600 text-white shadow-2xs'
                          }`}
                        >
                          {req.branch} Branch
                        </Badge>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Calendar className="size-3 text-[#009D9E]" />
                          {req.attendance_date}
                        </span>
                      </div>

                      {/* Request Details Pill */}
                      <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                        {req.request_type === 'LEAVE' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Request:</span>
                            <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-md text-[11px] border border-indigo-200/80">
                              {req.leave_type || 'Leave'}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold px-2 py-0.5 rounded-md text-[11px] border border-slate-200 dark:border-slate-700">
                              {req.leave_duration === 0.5 ? '0.5 (Half Day)' : '1.0 (Full Day)'}
                            </span>
                          </div>
                        )}

                        {req.request_type === 'MISSING_IN' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Missing In Time:</span>
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-md text-[11px] font-mono border border-emerald-200/80">
                              {req.requested_in_time || '--'}
                            </span>
                          </div>
                        )}

                        {req.request_type === 'MISSING_OUT' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Missing Out Time:</span>
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-md text-[11px] font-mono border border-emerald-200/80">
                              {req.requested_out_time || '--'}
                            </span>
                          </div>
                        )}

                        {req.reason && (
                          <span className="text-xs text-slate-600 dark:text-slate-300 italic font-medium">
                            &ldquo;{req.reason}&rdquo;
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium pt-0.5 flex items-center gap-2">
                        <span>Submitted by: <strong className="text-slate-600">{req.submitted_by || 'Branch User'}</strong></span>
                        <span>•</span>
                        <span>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </div>

                    {/* Right: Actions or Status Badges */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isPending ? (
                        rejectingId === req.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                            <Input
                              placeholder="Reason for rejection..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="h-9.5 text-xs w-48 rounded-xl"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(req)}
                              disabled={isProcessing}
                              className="h-9.5 text-xs px-3.5 rounded-xl font-extrabold cursor-pointer"
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingId(null)
                                setRejectReason('')
                              }}
                              className="h-9.5 text-xs px-2.5 text-slate-500 rounded-xl cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req)}
                              disabled={isProcessing}
                              className="h-9.5 text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-2xs gap-1.5 cursor-pointer transition-all"
                            >
                              {isProcessing ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3.5" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectingId(req.id)}
                              disabled={isProcessing}
                              className="h-9.5 text-xs px-4 border-rose-300 text-rose-700 hover:bg-rose-50 font-extrabold rounded-xl gap-1.5 cursor-pointer transition-all"
                            >
                              <XCircle className="size-3.5" />
                              Reject
                            </Button>
                          </div>
                        )
                      ) : isApproved ? (
                        <Badge className="bg-emerald-600 text-white gap-1.5 px-3 py-1 text-xs font-extrabold rounded-lg shadow-2xs">
                          <CheckCircle2 className="size-3.5" />
                          Approved
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs font-extrabold rounded-lg shadow-2xs">
                            <XCircle className="size-3.5" />
                            Rejected
                          </Badge>
                          {req.review_notes && (
                            <span className="text-[10px] text-slate-500 italic max-w-xs text-right font-medium">
                              {req.review_notes}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Premium Dialog Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-row items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#009D9E]" />
            <span>Showing {filteredRequests.length} request(s)</span>
          </div>

          <Button
            onClick={onClose}
            className="h-9.5 px-7 bg-gradient-to-r from-[#003D5C] to-[#002B40] hover:from-[#002B40] hover:to-[#001D2B] text-white font-extrabold text-xs rounded-xl shadow-xs border border-cyan-500/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
