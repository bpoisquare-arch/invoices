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
  const devSession = request.cookies.get('dev-auth-session')?.value === 'true'
  const isAuthenticated = !!user || devSession

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isPublicRoute = request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname === '/'

  if (!isAuthenticated && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/invoices'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/invoices'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
