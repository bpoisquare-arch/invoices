import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check dev session cookie fallback for instant login without email verification delays
  const devSessionVal = request.cookies.get('dev-auth-session')?.value
  const devSession = !!devSessionVal && devSessionVal !== 'false'
  const isAuthenticated = !!user || devSession

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/'

  // Enforce session access control redirects
  if (!isAuthenticated && !isAuthRoute && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthenticated && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/portal'
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthenticated && request.nextUrl.pathname === '/') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/portal'
    return NextResponse.redirect(redirectUrl)
  }

  // Role-Based Access Control for Viewer Role
  const userRoleCookie = request.cookies.get('user-role')?.value
  const isViewer =
    userRoleCookie === 'viewer' ||
    devSessionVal === 'viewer' ||
    user?.email?.toLowerCase() === 'team@mis.isquarebpo.com' ||
    user?.user_metadata?.role === 'viewer'

  if (isAuthenticated && isViewer) {
    const pathname = request.nextUrl.pathname

    const isRestrictedForViewer =
      pathname.startsWith('/invoices') ||
      pathname.startsWith('/companies') ||
      pathname.startsWith('/attendance') ||
      pathname.startsWith('/edlink') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/installments/new') ||
      pathname.includes('/installments/') && pathname.endsWith('/edit') ||
      pathname.startsWith('/stc/installments/new') ||
      pathname.includes('/stc/installments/') && pathname.endsWith('/edit') ||
      pathname.startsWith('/payslips/new') ||
      pathname.includes('/payslips/') && pathname.endsWith('/edit')

    if (isRestrictedForViewer) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/portal'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Inject Production-Grade Security Headers
  const headers = supabaseResponse.headers
  headers.set('X-Frame-Options', 'DENY') // Prevent clickjacking
  headers.set('X-Content-Type-Options', 'nosniff') // Prevent mime sniffing
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Tailored Content Security Policy (CSP)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://lh5.googleusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${url} wss://*.supabase.co https://api.resend.com`,
    "frame-ancestors 'none'", // Clickjacking protection (CSP Level 2)
  ].join('; ')

  headers.set('Content-Security-Policy', csp)

  return supabaseResponse
}
