import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ success: true })
  
  response.headers.append('Set-Cookie', 'dev-auth-session=; path=/; max-age=0')
  response.headers.append('Set-Cookie', 'user-role=; path=/; max-age=0')
  response.headers.append('Set-Cookie', 'user-email=; path=/; max-age=0')

  return response
}
