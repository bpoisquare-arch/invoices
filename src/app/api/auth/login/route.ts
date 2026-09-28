import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 1. Direct credentials bypass checks (admin / viewer)
    let authenticatedUser: { email: string; role: string; name?: string } | null = null

    if (email === 'admin@mis.isquarebpo.com' && password === 'admin123') {
      authenticatedUser = { email, role: 'admin', name: 'MIS Administrator' }
    } else if (email === 'team@mis.isquarebpo.com' && password === 'Team@1230') {
      authenticatedUser = { email, role: 'viewer', name: 'Team Viewer' }
    } else {
      // 2. Query MySQL profiles table
      const profile: any = await (prisma.profile as any).findFirst({
        where: { email }
      })

      if (profile && profile.passwordHash && verifyPassword(password, profile.passwordHash)) {
        authenticatedUser = {
          email: profile.email,
          role: profile.role || 'admin',
          name: profile.name || undefined
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      user: {
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        name: authenticatedUser.name
      }
    })

    const isSecure = process.env.NODE_ENV === 'production'
    const cookieOpts = `path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`

    response.headers.append(
      'Set-Cookie',
      `dev-auth-session=${authenticatedUser.role}; ${cookieOpts}`
    )
    response.headers.append(
      'Set-Cookie',
      `user-role=${authenticatedUser.role}; ${cookieOpts}`
    )
    response.headers.append(
      'Set-Cookie',
      `user-email=${encodeURIComponent(authenticatedUser.email)}; ${cookieOpts}`
    )

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error?.message || 'Authentication error' },
      { status: 500 }
    )
  }
}
