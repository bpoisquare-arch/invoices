import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'

import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session'

import { logAuditEventServer } from '@/lib/services/audit-server'

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

    // Authenticate exclusively against MySQL Profile table using secure PBKDF2 hash verification
    const profile: any = await (prisma.profile as any).findFirst({
      where: { email }
    })

    if (!profile || !profile.passwordHash || !verifyPassword(password, profile.passwordHash)) {
      await logAuditEventServer({
        action: 'Failed Login Attempt',
        module: 'auth',
        metadata: { email, reason: 'Invalid credentials' }
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const authenticatedUser = {
      id: profile.id,
      email: profile.email,
      role: (profile.role === 'viewer' ? 'viewer' : 'admin') as 'admin' | 'viewer',
      name: profile.name || undefined
    }

    await logAuditEventServer({
      action: 'Successful Login',
      module: 'auth',
      record_id: authenticatedUser.id,
      metadata: { email: authenticatedUser.email, role: authenticatedUser.role }
    })

    // Generate tamper-proof cryptographic HMAC-SHA256 session token
    const sessionToken = await createSessionToken({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      name: authenticatedUser.name,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        name: authenticatedUser.name
      }
    })

    const isSecure = process.env.NODE_ENV === 'production'
    const cookieOpts = `path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax${isSecure ? '; Secure' : ''}`

    // 1. Primary Secure Cryptographic Session Cookie (HttpOnly)
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${sessionToken}; HttpOnly; ${cookieOpts}`
    )

    // 2. Client-readable indicators for UI display and backward compatibility
    response.headers.append(
      'Set-Cookie',
      `user-role=${authenticatedUser.role}; ${cookieOpts}`
    )
    response.headers.append(
      'Set-Cookie',
      `dev-auth-session=${authenticatedUser.role}; ${cookieOpts}`
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
