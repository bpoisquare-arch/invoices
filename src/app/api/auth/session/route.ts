import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  const session = await verifySessionToken(token)

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email: session.email,
      role: session.role,
      name: session.name,
    }
  })
}
