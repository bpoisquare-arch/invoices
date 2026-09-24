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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  Building2,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Filter,
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
        // Update local state
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
        // Update local state
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
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Branch Attendance Requests
                  {pendingCount > 0 && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs px-2 py-0.5 rounded-full">
                      {pendingCount} Pending
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review and approve leave or timing regularization requests submitted by Lahore & Multan branch users
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
              disabled={isLoading}
              className="h-8 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search employee, batch, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pl-8 bg-white dark:bg-slate-800"
              />
            </div>

            {/* Branch Filter */}
            <Select value={selectedBranch} onValueChange={(val) => setSelectedBranch(val || 'all')}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                <SelectItem value="Lahore">Lahore Branch</SelectItem>
                <SelectItem value="Multan">Multan Branch</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || 'all')}>
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending Only</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <p className="text-xs">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No requests found</p>
              <p className="text-xs text-slate-400 max-w-sm">
                {selectedStatus === 'PENDING'
                  ? 'There are currently no pending requests from branch users.'
                  : 'No requests match the selected branch and status filters.'}
              </p>
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
                  className={`p-4 rounded-xl border transition-all ${
                    isPending
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 shadow-xs'
                      : isApproved
                      ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40'
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Employee info & date */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {req.employee_name || 'Employee'}
                        </span>
                        {req.batch_id && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4.5">
                            {req.batch_id}
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            req.branch.toLowerCase().includes('lahore')
                              ? 'bg-blue-600 text-white'
                              : 'bg-purple-600 text-white'
                          }`}
                        >
                          {req.branch} Branch
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {req.attendance_date}
                        </span>
                      </div>

                      {/* Request Details */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {req.request_type === 'LEAVE' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Request:</span>
                            <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold px-2 py-0.5 rounded text-[11px]">
                              {req.leave_type || 'Leave'}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded text-[11px] border border-slate-200 dark:border-slate-700">
                              {req.leave_duration === 0.5 ? '0.5 (Half Day)' : '1.0 (Full Day)'}
                            </span>
                          </div>
                        )}

                        {req.request_type === 'MISSING_IN' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Missing In Time:</span>
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] font-mono">
                              {req.requested_in_time || '--'}
                            </span>
                          </div>
                        )}

                        {req.request_type === 'MISSING_OUT' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Missing Out Time:</span>
                            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px] font-mono">
                              {req.requested_out_time || '--'}
                            </span>
                          </div>
                        )}

                        {req.reason && (
                          <span className="text-xs text-slate-600 dark:text-slate-400 italic">
                            &ldquo;{req.reason}&rdquo;
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 pt-0.5 flex items-center gap-2">
                        <span>Submitted by: {req.submitted_by || 'Branch'}</span>
                        <span>•</span>
                        <span>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </div>

                    {/* Right: Actions or Status */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isPending ? (
                        rejectingId === req.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                            <Input
                              placeholder="Reason for rejection..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="h-8 text-xs w-44"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(req)}
                              disabled={isProcessing}
                              className="h-8 text-xs px-2.5"
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
                              className="h-8 text-xs px-2 text-slate-500"
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
                              className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs gap-1.5"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectingId(req.id)}
                              disabled={isProcessing}
                              className="h-8 text-xs px-3 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50 font-medium gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </Button>
                          </div>
                        )
                      ) : isApproved ? (
                        <Badge className="bg-emerald-600 text-white gap-1 px-2.5 py-1 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approved
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge variant="destructive" className="gap-1 px-2.5 py-1 text-xs font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected
                          </Badge>
                          {req.review_notes && (
                            <span className="text-[10px] text-slate-400 italic max-w-xs text-right">
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

        <DialogFooter className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
