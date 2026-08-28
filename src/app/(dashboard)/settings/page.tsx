'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { logAuditEvent } from '@/lib/services/audit.service'
import { Shield, Key, Save, Loader2, CheckCircle2, Lock, Smartphone, RefreshCw, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string>('user')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 2FA/MFA State Variables
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [enrollData, setEnrollData] = useState<{ id: string; qrCode: string; secret: string } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isMfaLoading, setIsMfaLoading] = useState(false)
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
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        // 1. Load User Profile / Role
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single()
        
        if (profileData) {
          setRole(profileData.role)
        }

        // 2. Load 2FA status from Supabase
        const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors()
        if (!factorsErr && factorsData) {
          const activeFactor = (factorsData.totp || []).find((f: any) => f.status === 'verified')
          if (activeFactor) {
            setMfaEnabled(true)
            setMfaFactorId(activeFactor.id)
          } else {
            setMfaEnabled(false)
            setMfaFactorId(null)
          }
        }
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

    // Strict Password validation check
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

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      await logAuditEvent({
        action: 'Failed Password Change Attempt',
        module: 'settings',
        metadata: { error: error.message }
      })
      setMessage({ type: 'error', text: error.message })
    } else {
      await logAuditEvent({
        action: 'Successful Password Change',
        module: 'settings',
      })
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setIsSaving(false)
  }

  // Multi-Factor Authentication TOTP Enrollment Flow
  async function handleEnableMfa() {
    setIsMfaLoading(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Invoice Pro',
        friendlyName: user?.email || 'Admin',
      })

      if (error) {
        throw error
      }

      if (data) {
        setEnrollData({
          id: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
        })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'MFA enrollment initialization failed.' })
    } finally {
      setIsMfaLoading(false)
    }
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollData || !verificationCode) return

    setIsMfaLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      
      // 1. Create a verification challenge for the enrolled factor
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id,
      })

      if (challengeErr) {
        throw challengeErr
      }

      // 2. Verify challenge with authenticator code
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challengeData.id,
        code: verificationCode.trim(),
      })

      if (verifyErr) {
        throw verifyErr
      }

      await logAuditEvent({
        action: 'Enabled MFA (TOTP)',
        module: 'settings',
        metadata: { factorId: enrollData.id }
      })

      setMessage({ type: 'success', text: 'Multi-Factor Authentication enabled successfully!' })
      setEnrollData(null)
      setVerificationCode('')
      await loadUserData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Invalid code verification failed.' })
    } finally {
      setIsMfaLoading(false)
    }
  }

  async function handleDisableMfa() {
    if (!mfaFactorId) return
    if (!confirm('Are you sure you want to disable Multi-Factor Authentication? Your account will be less secure.')) return

    setIsMfaLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: mfaFactorId,
      })

      if (error) {
        throw error
      }

      await logAuditEvent({
        action: 'Disabled MFA (TOTP)',
        module: 'settings',
        metadata: { factorId: mfaFactorId }
      })

      setMessage({ type: 'success', text: 'Multi-Factor Authentication disabled successfully.' })
      await loadUserData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to disable MFA.' })
    } finally {
      setIsMfaLoading(false)
    }
  }

  // Log out all other active sessions securely
  async function handleLogoutOthers() {
    setIsSessionLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut({ scope: 'others' })

      if (error) {
        throw error
      }

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

      {/* Multi-Factor Authentication (2FA) Card */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Multi-Factor Authentication (2FA)</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Secure your account using standard TOTP authenticator apps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Multi-Factor Authentication is currently Active on your account.
              </div>
              <Button
                type="button"
                onClick={handleDisableMfa}
                disabled={isMfaLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {isMfaLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Disable Multi-Factor Authentication
              </Button>
            </div>
          ) : enrollData ? (
            <form onSubmit={handleVerifyMfa} className="space-y-4 p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="bg-white p-2 border border-slate-200 rounded-xl shadow-xs shrink-0">
                  {/* Render native Supabase dynamic QR code */}
                  <img src={enrollData.qrCode} alt="TOTP QR Code" className="w-44 h-44" />
                </div>
                <div className="space-y-2 flex-1 text-xs text-slate-600">
                  <h4 className="font-bold text-sm text-slate-900">Setup Authenticator App</h4>
                  <p>1. Scan the QR code using Google Authenticator, Microsoft Authenticator, or Authy.</p>
                  <p>2. If you cannot scan, manually type the secret key below:</p>
                  <div className="p-2 bg-white rounded border font-mono font-bold text-[#001E2F] select-all tracking-wider text-center text-sm">
                    {enrollData.secret}
                  </div>
                  <p className="pt-1">3. Enter the 6-digit confirmation code generated by your app below:</p>
                  
                  <div className="flex gap-2 items-end pt-1">
                    <div className="w-32">
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        className="text-center font-bold tracking-wider text-base"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isMfaLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer">
                      {isMfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                      Verify & Activate 2FA
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEnrollData(null)} className="text-xs rounded-xl border-slate-300">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Add an extra layer of protection to your account. When enabled, logging in will require you to provide a 6-digit verification code from your mobile authenticator app.
              </p>
              <Button
                type="button"
                onClick={handleEnableMfa}
                disabled={isMfaLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {isMfaLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Enable Multi-Factor Authentication
              </Button>
            </div>
          )}
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
