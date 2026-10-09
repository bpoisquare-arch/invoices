import { NextResponse } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ success: true })
  
  response.headers.append('Set-Cookie', `${SESSION_COOKIE_NAME}=; path=/; max-age=0; HttpOnly; SameSite=Lax`)
  response.headers.append('Set-Cookie', 'dev-auth-session=; path=/; max-age=0; path=/')
  response.headers.append('Set-Cookie', 'user-role=; path=/; max-age=0; path=/')
  response.headers.append('Set-Cookie', 'user-email=; path=/; max-age=0; path=/')

  return response
}
