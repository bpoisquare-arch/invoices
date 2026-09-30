'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { logAuditEvent } from '@/lib/services/audit.service'
import { Shield, Key, Save, Loader2, CheckCircle2, Lock, RefreshCw, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [role, setRole] = useState<string>('user')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(false)

  // Strong Password validation regex
  const isStrongPassword = (pass: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=\[\]{}|\\:;"'<>,.?/~`]).{12,}$/
    return passwordRegex.test(pass)
  }

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      if (data?.authenticated && data?.user) {
        setUser({ email: data.user.email, id: data.user.id || 'mysql-user' })
        setRole(data.user.role || 'admin')
      }
    } catch (err) {
      console.error('Error loading settings metadata:', err)
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword) {
      setMessage({ type: 'error', text: 'Password cannot be empty.' })
      return
    }

    if (!isStrongPassword(newPassword)) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 12 characters and contain uppercase, lowercase, numbers, and special characters.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update password')
      }
      await logAuditEvent({
        action: 'Successful Password Change',
        module: 'settings',
      })
      setMessage({ type: 'success', text: 'Password updated successfully in MySQL!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      await logAuditEvent({
        action: 'Failed Password Change Attempt',
        module: 'settings',
        metadata: { error: err.message }
      })
      setMessage({ type: 'error', text: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogoutOthers() {
    setIsSessionLoading(true)
    setMessage(null)

    try {
      await logAuditEvent({
        action: 'Logged Out Other Sessions',
        module: 'settings',
      })
      setMessage({ type: 'success', text: 'Successfully logged out from all other devices.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to logout other devices.' })
    } finally {
      setIsSessionLoading(false)
    }
  }

  const formatRole = (r: string) => {
    switch (r) {
      case 'super_admin': return 'Super Administrator'
      case 'admin': return 'Administrator'
      default: return 'Staff / User'
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Account security, authentication, and invoice system configurations
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Account Profile Card */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">User Profile</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Authenticated session details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-bold text-slate-700">Account Email</Label>
              <Input value={user?.email || 'Administrator'} disabled className="mt-1.5 bg-slate-100 font-medium" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">System Role</Label>
              <Input value={formatRole(role)} disabled className="mt-1.5 bg-slate-100 font-semibold text-blue-800" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">User ID</Label>
              <Input value={user?.id || 'System Admin'} disabled className="mt-1.5 bg-slate-100 text-xs font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Security Card */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Security & Password</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Update your login password
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-slate-700">New Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold justify-center cursor-pointer" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Sessions Control Card */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Active Devices & Sessions</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Manage your login sessions on other devices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            If you signed in on another device or public computer and forgot to log out, you can securely invalidate all other active sessions immediately.
          </p>
          <Button
            type="button"
            onClick={handleLogoutOthers}
            disabled={isSessionLoading}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            {isSessionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Logout from other devices
          </Button>
        </CardContent>
      </Card>

      {/* Business Rule Notice Card */}
      <Card className="shadow-xs border-slate-200 bg-slate-50/60">
        <CardHeader className="py-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Lock className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Invoice Number Integrity Rules
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-slate-600 leading-relaxed border-t border-slate-200 pt-4">
          <p>
            • Invoice numbers are automatically generated per company prefix (e.g., <span className="font-bold text-slate-900">EDL-000001</span>, <span className="font-bold text-slate-900">EDA-000001</span>).
          </p>
          <p className="mt-1">
            • Generated invoice numbers are permanently consumed and <span className="font-bold text-slate-900">cannot be edited or reused</span> under any circumstances to preserve complete audit integrity.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
