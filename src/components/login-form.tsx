'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { logAuditEvent } from "@/lib/services/audit.service"
import { Info, Loader2, X, Mail, ShieldAlert, Eye, EyeOff, LogIn } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [adminNotice, setAdminNotice] = useState<{ title: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  // Load saved email if remembered
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('mis_remember_email')
      if (savedEmail) {
        setEmail(savedEmail)
      }
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setAdminNotice(null)

    const cleanEmail = email.trim().toLowerCase()

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      })

      const result = await res.json()

      if (!res.ok) {
        await logAuditEvent({
          action: 'Failed Login',
          module: 'auth',
          metadata: { email: cleanEmail, reason: result?.error || 'Invalid credentials' }
        })
        setError(result?.error || "Invalid email or password.")
        setIsLoading(false)
        return
      }

      const role = result?.user?.role || 'admin'
      const maxAge = rememberSession ? 60 * 60 * 24 * 30 : 86400 // 30 days vs 1 day
      document.cookie = `dev-auth-session=${role}; path=/; max-age=${maxAge}; SameSite=Lax`
      document.cookie = `user-role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`
      document.cookie = `user-email=${encodeURIComponent(result?.user?.email || cleanEmail)}; path=/; max-age=${maxAge}; SameSite=Lax`

      if (rememberSession) {
        localStorage.setItem('mis_remember_email', cleanEmail)
      } else {
        localStorage.removeItem('mis_remember_email')
      }

      await logAuditEvent({
        action: 'Successful Login',
        module: 'auth',
        metadata: { email: cleanEmail, role }
      })

      router.push('/portal')
      router.refresh()
    } catch (err: any) {
      await logAuditEvent({
        action: 'Login Error',
        module: 'auth',
        metadata: { email: cleanEmail, error: err?.message || 'Unknown error' }
      })
      setError("An unexpected authentication error occurred.")
      setIsLoading(false)
    }
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    setAdminNotice({
      title: "Password Reset Request",
      message: "To reset your password, please contact the administrator at admin@mis.isquarebpo.com"
    })
  }

  const handleContactAdmin = (e: React.MouseEvent) => {
    e.preventDefault()
    setAdminNotice({
      title: "Account Registration",
      message: "To create a new account, please contact the administrator at admin@mis.isquarebpo.com"
    })
  }

  return (
    <div className={cn("w-full flex flex-col gap-6", className)} {...props}>
      {/* Mobile Branding (Visible only on smaller screens) */}
      <div className="lg:hidden flex items-center gap-3 pb-2 border-b border-slate-100">
        <img src="/isquarebpo.png" alt="ISquare BPO" className="h-9 w-auto object-contain" />
        <div>
          <h2 className="text-sm font-bold text-[#001E2F] leading-tight">ISquare BPO</h2>
          <p className="text-[11px] text-slate-500 font-medium">Management Information System</p>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#001E2F] tracking-tight">
          Sign In
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Manage monthly operations, invoices, budgets, and reports.
        </p>
      </div>

      {/* Admin Notice Banner */}
      {adminNotice && (
        <div className="relative p-4 rounded-xl bg-[#001E2F] text-white text-xs space-y-1.5 border border-[#0E3E5B] shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={() => setAdminNotice(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
            aria-label="Close message"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 font-semibold text-[#81F5F5]">
            <Info className="w-4 h-4 shrink-0" />
            {adminNotice.title}
          </div>
          <p className="text-slate-200 pr-5 leading-relaxed">
            {adminNotice.message}
          </p>
          <a
            href="mailto:admin@mis.isquarebpo.com"
            className="inline-flex items-center gap-1.5 text-xs text-[#81F5F5] font-semibold underline hover:text-white pt-1 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" /> Contact Admin (admin@mis.isquarebpo.com)
          </a>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {/* Form Fields matching the attachment style */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email or Username */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-slate-700 block">
            Email or Username
          </label>
          <input
            id="email"
            type="email"
            placeholder="admin@mis.isquarebpo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
            className="w-full h-11 px-3.5 text-xs sm:text-sm bg-[#EEF4FB] border border-[#DCE4EC] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#009D9E] focus:ring-2 focus:ring-[#009D9E]/20 transition-all font-medium"
          />
        </div>

        {/* Password with Eye Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-semibold text-slate-700">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs font-semibold text-[#009D9E] hover:text-[#007D7E] hover:underline transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="w-full h-11 pl-3.5 pr-11 text-xs sm:text-sm bg-[#EEF4FB] border border-[#DCE4EC] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#009D9E] focus:ring-2 focus:ring-[#009D9E]/20 transition-all font-mono font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Remember Session Checkbox */}
        <div className="flex items-center gap-2.5 pt-0.5">
          <input
            type="checkbox"
            id="remember-session"
            checked={rememberSession}
            onChange={(e) => setRememberSession(e.target.checked)}
            className="size-4 rounded border-slate-300 accent-[#009D9E] text-[#009D9E] focus:ring-[#009D9E] cursor-pointer"
          />
          <label
            htmlFor="remember-session"
            className="text-xs font-medium text-slate-600 cursor-pointer select-none"
          >
            Remember my entity session
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#001E2F] hover:bg-[#0E3E5B] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin text-[#81F5F5]" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="size-4 text-[#81F5F5]" />
                <span>Sign In</span>
              </>
            )}
          </Button>
        </div>

        {/* Contact Administrator Link */}
        <p className="text-center text-xs text-slate-500 pt-3">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={handleContactAdmin}
            className="font-bold text-[#001E2F] underline hover:text-[#009D9E] transition-colors cursor-pointer"
          >
            Contact Administrator
          </button>
        </p>
      </form>
    </div>
  )
}
