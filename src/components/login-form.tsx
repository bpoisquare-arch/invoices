'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { logAuditEvent } from "@/lib/services/audit.service"
import { Info, Loader2, X, Mail, ShieldAlert } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("admin@mis.isquarebpo.com")
  const [password, setPassword] = useState("admin123")
  const [isLoading, setIsLoading] = useState(false)
  const [adminNotice, setAdminNotice] = useState<{ title: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // MFA Flow States
  const [step, setStep] = useState<'login' | 'mfa'>('login')
  const [mfaCode, setMfaCode] = useState("")
  const [mfaFactorId, setMfaFactorId] = useState("")
  const [mfaChallengeId, setMfaChallengeId] = useState("")

  const router = useRouter()

  // Strong Password validation regex (12+ characters, upper, lower, digit, special char)
  const isStrongPassword = (pass: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=\[\]{}|\\:;"'<>,.?/~`]).{12,}$/
    return passwordRegex.test(pass)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setAdminNotice(null)

    try {
      const supabase = createClient()

      // 1. Perform Supabase Sign In
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInErr) {
        // Fallback automatic sign up for local development environment
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        })

        if (!signUpErr && signUpData?.user) {
          // Retry signing in after auto signup fallback
          const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (!retryErr && retryData?.user) {
            await handlePostAuth(retryData.user, supabase)
            return
          }
        }

        // Standard Generic Error (do not expose email existence details)
        await logAuditEvent({
          action: 'Failed Login',
          module: 'auth',
          metadata: { email, reason: 'Invalid credentials' }
        })
        setError("Invalid email or password.")
        setIsLoading(false)
        return
      }

      if (signInData?.user) {
        await handlePostAuth(signInData.user, supabase)
      }
    } catch (err: any) {
      await logAuditEvent({
        action: 'Login Error',
        module: 'auth',
        metadata: { email, error: err?.message || 'Unknown error' }
      })
      setError("An unexpected authentication error occurred.")
      setIsLoading(false)
    }
  }

  // Handle post-password authentication checks (MFA / 2FA redirection)
  async function handlePostAuth(user: any, supabase: any) {
    try {
      // Check if user has Multi-Factor Authentication factors enrolled
      const { data: factorData, error: factorErr } = await supabase.auth.mfa.listFactors()

      if (factorErr) {
        throw factorErr
      }

      const activeFactors = factorData?.totp || []
      const enrolledFactor = activeFactors.find((f: any) => f.status === 'verified')

      if (enrolledFactor) {
        // User has verified TOTP factors, initiate verification challenge
        const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
          factorId: enrolledFactor.id,
        })

        if (challengeErr) {
          throw challengeErr
        }

        if (challenge) {
          setMfaFactorId(enrolledFactor.id)
          setMfaChallengeId(challenge.id)
          setStep('mfa')
          setIsLoading(false)
          return
        }
      }

      // No MFA enrolled, proceed to standard login completion
      await completeLoginSession()
    } catch (err: any) {
      setError(err?.message || "Error setting up security validation.")
      setIsLoading(false)
    }
  }

  // Verification helper for Multi-Factor Authentication TOTP code
  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode.trim(),
      })

      if (verifyErr) {
        await logAuditEvent({
          action: 'Failed MFA Verification',
          module: 'auth',
          metadata: { email, factorId: mfaFactorId }
        })
        setError("Invalid authenticator verification code. Please try again.")
        setIsLoading(false)
        return
      }

      await logAuditEvent({
        action: 'MFA Verified Login',
        module: 'auth',
      })
      await completeLoginSession()
    } catch (err: any) {
      setError(err?.message || "MFA validation failure.")
      setIsLoading(false)
    }
  }

  async function completeLoginSession() {
    document.cookie = 'dev-auth-session=true; path=/; max-age=86400; SameSite=Lax; Secure'
    await logAuditEvent({
      action: 'Successful Login',
      module: 'auth',
    })
    router.push('/portal')
    router.refresh()
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="relative overflow-hidden border border-[#001E2F]/15 shadow-md rounded-2xl bg-white">
        <CardHeader className="p-6 sm:p-8 pb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold text-[#001E2F] tracking-tight">
            {step === 'mfa' ? "Security Verification" : "Login to your account"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-500">
            {step === 'mfa' 
              ? "Enter the 6-digit verification code from your authenticator app."
              : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-0 space-y-4">
          {/* Admin Notice Banner matching system color palette */}
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
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {step === 'login' ? (
            <form onSubmit={handleLogin}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="email" className="text-xs font-semibold text-[#001E2F]">
                    Email
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@mis.isquarebpo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="rounded-xl border-slate-200 focus-visible:ring-[#001E2F] focus-visible:border-[#001E2F]"
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password" className="text-xs font-semibold text-[#001E2F]">
                      Password
                    </FieldLabel>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="ml-auto inline-block text-xs font-medium text-[#0E3E5B] hover:text-[#001E2F] hover:underline transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="rounded-xl border-slate-200 focus-visible:ring-[#001E2F] focus-visible:border-[#001E2F]"
                  />
                </Field>

                <Field className="pt-2 gap-2.5">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#001E2F] hover:bg-[#0E3E5B] text-white font-medium py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>

                  <FieldDescription className="text-center text-xs text-slate-500 pt-2">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={handleContactAdmin}
                      className="font-semibold text-[#001E2F] underline hover:text-[#0E3E5B] cursor-pointer"
                    >
                      Contact Administrator
                    </button>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="mfaCode" className="text-xs font-semibold text-[#001E2F]">
                    Authenticator Code
                  </FieldLabel>
                  <Input
                    id="mfaCode"
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    disabled={isLoading}
                    required
                    className="rounded-xl border-slate-200 text-center tracking-widest text-lg font-bold focus-visible:ring-[#001E2F] focus-visible:border-[#001E2F]"
                  />
                </Field>

                <Field className="pt-2 gap-2.5">
                  <Button
                    type="submit"
                    disabled={isLoading || mfaCode.length < 6}
                    className="w-full bg-[#001E2F] hover:bg-[#0E3E5B] text-white font-medium py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verifying Code...
                      </>
                    ) : (
                      "Verify & Authorize"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('login')}
                    disabled={isLoading}
                    className="w-full border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl"
                  >
                    Back to Login
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
