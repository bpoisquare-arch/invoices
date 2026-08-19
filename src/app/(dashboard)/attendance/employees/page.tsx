'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  History,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Building,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EMPLOYEE_DESIGNATIONS } from '@/lib/constants/designations'
import { Employee } from '@/lib/supabase/database.types'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add Employee Modal
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesignation, setNewDesignation] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [addWarning, setAddWarning] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit Employee Modal
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesignation, setEditDesignation] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete Employee Modal
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/attendance/employees')
      const data = await res.json()
      if (data.success && data.employees) {
        setEmployees(data.employees)
      }
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Check duplicate employee name as user types
  const handleNameBlur = async () => {
    if (!newName.trim()) {
      setAddWarning(null)
      return
    }
    try {
      const res = await fetch(`/api/attendance/employees?checkName=${encodeURIComponent(newName.trim())}`)
      const data = await res.json()
      if (data.exists) {
        setAddWarning(
          `Warning: An employee named "${newName.trim()}" already exists (${data.employees[0].employee_id}). Adding this will create an additional employee with this name.`
        )
      } else {
        setAddWarning(null)
      }
    } catch (e) {
      // ignore
    }
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setIsSaving(true)

    try {
      const res = await fetch('/api/attendance/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          designation: newDesignation.trim(),
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to create employee.')
      }

      setIsAddOpen(false)
      setNewName('')
      setNewDesignation('')
      setAddWarning(null)
      fetchEmployees()
    } catch (err: any) {
      setAddError(err.message || 'Error creating employee.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return
    setEditError(null)
    setIsSaving(true)

    try {
      const res = await fetch('/api/attendance/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEmployee.id,
          name: editName.trim(),
          designation: editDesignation.trim(),
          is_active: editActive,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to update employee.')
      }

      setEditingEmployee(null)
      fetchEmployees()
    } catch (err: any) {
      setEditError(err.message || 'Error updating employee.')
    } finally {
      setIsSaving(false)
    }
  }

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp)
    setEditName(emp.name)
    setEditDesignation(emp.designation)
    setEditActive(emp.is_active)
    setEditError(null)
  }

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return
    setDeleteError(null)
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/attendance/employees?id=${encodeURIComponent(employeeToDelete.id)}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete employee.')
      }

      setEmployeeToDelete(null)
      fetchEmployees()
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting employee.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase()
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.employee_id.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Montserrat'] text-3xl font-extrabold text-slate-900 tracking-tight">
            Employees
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage employees and their attendance profiles.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/attendance/import">
            <Button
              variant="outline"
              className="h-9 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold uppercase tracking-wider gap-2 shadow-2xs cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#009D9E]" />
              Upload Excel Files
            </Button>
          </Link>

          <Button
            onClick={() => {
              setIsAddOpen(true)
              setAddError(null)
              setAddWarning(null)
            }}
            className="h-9 px-4 bg-black hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider gap-1.5 shadow-sm cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            ADD EMPLOYEE
          </Button>
        </div>
      </div>

      {/* Search & Counter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            type="text"
            placeholder="Search by Employee Name, Employee ID, Designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs border-slate-200"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
          <span>Total Staff: <strong className="text-slate-900">{employees.length}</strong></span>
          <span>•</span>
          <span>Active: <strong className="text-emerald-600">{employees.filter((e) => e.is_active).length}</strong></span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date Added</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#009D9E]" />
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No employees found matching your search query.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const initial = emp.name.trim().charAt(0).toUpperCase() || 'E'
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#003D5C]">
                        {emp.employee_id}
                      </td>

                      {/* Name with Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#003D5C]/10 text-[#003D5C] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#003D5C]/15">
                            {initial}
                          </div>
                          <div>
                            <Link
                              href={`/attendance/employees/${emp.id}`}
                              className="font-bold text-slate-900 hover:text-[#009D9E] transition-colors block text-xs"
                            >
                              {emp.name}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 font-medium text-slate-600 text-xs">
                        {emp.designation}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            emp.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Date Added */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium text-xs">
                        {new Date(emp.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <Link href={`/attendance/employees/${emp.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-[#009D9E] hover:bg-[#009D9E]/10 gap-1"
                          >
                            <History className="w-3.5 h-3.5" />
                            Attendance History
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(emp)}
                          className="h-8 text-xs font-semibold text-slate-600 hover:bg-slate-100 gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEmployeeToDelete(emp)
                            setDeleteError(null)
                          }}
                          className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-[#003D5C] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#009D9E]" />
              Add New Employee
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Employee ID will be generated automatically and uniquely.
            </p>
          </DialogHeader>

          {addError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          {addWarning && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{addWarning}</span>
            </div>
          )}

          <form onSubmit={handleCreateEmployee} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Employee Name *
              </Label>
              <Input
                type="text"
                placeholder="e.g. Ayesha Khan"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleNameBlur}
                required
                className="text-sm border-slate-200"
              />
              <p className="text-[10px] text-slate-400">
                This exact name will be used as the matching key when importing Excel attendance files.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Designation *
              </Label>
              <Select value={newDesignation} onValueChange={setNewDesignation} required>
                <SelectTrigger className="text-sm border-slate-200 bg-white">
                  <SelectValue placeholder="Select Designation..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {EMPLOYEE_DESIGNATIONS.map((desig) => (
                    <SelectItem key={desig} value={desig}>
                      {desig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Automatic ID Assignment:</p>
              <p>
                An immutable sequential identifier (e.g. <span className="font-mono font-bold text-[#003D5C]">EMP-XXXX</span>) will be assigned atomically by the database.
              </p>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !newDesignation}
                className="bg-[#009D9E] hover:bg-[#007A7A] text-white text-xs font-bold uppercase tracking-wider gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Create Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={!!editingEmployee} onOpenChange={(open: boolean) => !open && setEditingEmployee(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-[#003D5C] flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#009D9E]" />
              Edit Employee
            </DialogTitle>
            <p className="text-xs text-slate-500 font-mono">
              ID: {editingEmployee?.employee_id} (Immutable)
            </p>
          </DialogHeader>

          {editError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateEmployee} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Employee Name *
              </Label>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="text-sm border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Designation *
              </Label>
              <Select value={editDesignation} onValueChange={setEditDesignation} required>
                <SelectTrigger className="text-sm border-slate-200 bg-white">
                  <SelectValue placeholder="Select Designation..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {EMPLOYEE_DESIGNATIONS.map((desig) => (
                    <SelectItem key={desig} value={desig}>
                      {desig}
                    </SelectItem>
                  ))}
                  {editDesignation && !EMPLOYEE_DESIGNATIONS.includes(editDesignation as any) && (
                    <SelectItem value={editDesignation}>{editDesignation}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editActive"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#009D9E] accent-[#009D9E]"
              />
              <Label htmlFor="editActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                Active Employee
              </Label>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEmployee(null)}
                disabled={isSaving}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#009D9E] hover:bg-[#007A7A] text-white text-xs font-bold uppercase tracking-wider gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Modal */}
      <Dialog open={!!employeeToDelete} onOpenChange={(open: boolean) => !open && setEmployeeToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-[#E2E8F0] shadow-xl rounded-xl font-sans">
          <DialogHeader className="border-b border-[#E2E8F0] pb-3 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="font-['Montserrat'] text-base font-bold text-[#003D5C]">
                  Delete Employee
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm permanent removal of this employee record.
                </p>
              </div>
            </div>
          </DialogHeader>

          {employeeToDelete && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3.5 my-2 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Employee ID:</span>
                <span className="font-mono font-bold text-[#003D5C] bg-white px-2 py-0.5 rounded border border-slate-200">
                  {employeeToDelete.employee_id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Employee Name:</span>
                <span className="font-bold text-slate-800">{employeeToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Designation:</span>
                <span className="font-medium text-slate-700">{employeeToDelete.designation}</span>
              </div>
            </div>
          )}

          <div className="bg-rose-50/90 border border-rose-200/90 rounded-lg p-3 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Are you sure you want to delete employee <strong className="text-rose-950 font-bold">{employeeToDelete?.name}</strong> (<span className="font-mono">{employeeToDelete?.employee_id}</span>)? This will permanently remove the employee and their attendance records.
            </span>
          </div>

          {deleteError && (
            <div className="p-2.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
              {deleteError}
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-[#E2E8F0] gap-2 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmployeeToDelete(null)}
              disabled={isDeleting}
              className="text-xs font-semibold h-9 px-4 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase text-xs h-9 px-4 rounded-md shadow-xs gap-1.5 transition-colors cursor-pointer"
              onClick={handleDeleteEmployee}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
