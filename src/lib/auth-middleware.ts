import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // Check auth session cookie
  const devSessionVal = request.cookies.get('dev-auth-session')?.value
  const devSession = !!devSessionVal && devSessionVal !== 'false'
  const isAuthenticated = devSession

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
  const isViewer = userRoleCookie === 'viewer' || devSessionVal === 'viewer'

  if (isAuthenticated && isViewer) {
    const pathname = request.nextUrl.pathname

    const isRestrictedForViewer =
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

    if (isRestrictedForViewer) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/portal'
      return NextResponse.redirect(redirectUrl)
    }
  }

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
