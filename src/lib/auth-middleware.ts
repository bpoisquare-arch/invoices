import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Check & verify cryptographic session token
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(sessionToken)
  const isAuthenticated = !!session
  const userRole = session?.role || 'viewer'

  const isAuthRoute = pathname.startsWith('/login')
  const isPublicApiRoute =
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/auth/session') ||
    pathname.startsWith('/api/audit-log')

  const isStaticOrPublic =
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/auth')

  // 2. Unauthenticated handling
  if (!isAuthenticated) {
    // If it's an API route and not a public auth endpoint, return 401 JSON
    if (pathname.startsWith('/api')) {
      if (!isPublicApiRoute) {
        return NextResponse.json(
          { error: 'Unauthorized: Valid authentication session required.' },
          { status: 401 }
        )
      }
    } else if (!isAuthRoute && !isStaticOrPublic) {
      // Protected dashboard page: redirect to login
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 3. Authenticated user visiting /login or root /
  if (isAuthenticated) {
    if (isAuthRoute || pathname === '/') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/portal'
      return NextResponse.redirect(redirectUrl)
    }

    // 4. Role-Based Access Control (RBAC) for Viewer role
    if (userRole === 'viewer') {
      const isRestrictedPage =
        pathname.startsWith('/invoices') ||
        pathname.startsWith('/companies') ||
        pathname.startsWith('/attendance') ||
        pathname.startsWith('/edlink') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/installments/new') ||
        (pathname.includes('/installments/') && pathname.endsWith('/edit')) ||
        pathname.startsWith('/stc/installments/new') ||
        (pathname.includes('/stc/installments/') && pathname.endsWith('/edit')) ||
        pathname.startsWith('/payslips/new') ||
        (pathname.includes('/payslips/') && pathname.endsWith('/edit'))

      if (isRestrictedPage) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/portal'
        return NextResponse.redirect(redirectUrl)
      }

      // Restrict mutating actions on sensitive APIs for viewer role
      const isMutatingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
      const isRestrictedApiMutation =
        isMutatingMethod &&
        (pathname.startsWith('/api/invoices') ||
          pathname.startsWith('/api/companies') ||
          pathname.startsWith('/api/attendance') ||
          pathname.startsWith('/api/setup-db'))

      if (isRestrictedApiMutation) {
        return NextResponse.json(
          { error: 'Forbidden: Viewer role does not have permission to perform this action.' },
          { status: 403 }
        )
      }
    }
  }

  const response = NextResponse.next({
    request,
  })

  // Inject Security Headers
  const headers = response.headers
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Tailored Content Security Policy (CSP)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://lh5.googleusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.resend.com",
    "frame-ancestors 'none'",
  ].join('; ')

  headers.set('Content-Security-Policy', csp)

  return response
}
