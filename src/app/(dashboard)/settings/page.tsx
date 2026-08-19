'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Shield, Key, Save, Loader2, CheckCircle2, Lock } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setIsSaving(true)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setIsSaving(false)
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
          className={`p-4 rounded-md text-xs font-semibold flex items-center gap-2 ${
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-slate-700">Account Email</Label>
              <Input value={user?.email || 'Administrator'} disabled className="mt-1.5 bg-slate-100 font-medium" />
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

            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update Password
            </Button>
          </form>
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
