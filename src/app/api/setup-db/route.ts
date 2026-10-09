import { NextRequest, NextResponse } from 'next/server'
import { ensureSeedData } from '@/lib/services/seed'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

async function checkAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.SETUP_SECRET
  const headerSecret = request.headers.get('x-setup-secret')
  if (secret && headerSecret === secret) return true

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)
  return !!session && session.role === 'admin'
}

export async function GET(request: NextRequest) {
  if (!(await checkAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
  }
  const result = await ensureSeedData()
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  return GET(request)
}
