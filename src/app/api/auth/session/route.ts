import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get('dev-auth-session')?.value
  const role = cookieStore.get('user-role')?.value || session || 'admin'
  const email = cookieStore.get('user-email')?.value ? decodeURIComponent(cookieStore.get('user-email')!.value) : (role === 'viewer' ? 'team@mis.isquarebpo.com' : 'admin@mis.isquarebpo.com')

  if (!session || session === 'false') {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email,
      role
    }
  })
}
