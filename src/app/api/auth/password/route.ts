import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('dev-auth-session')?.value
    if (!session || session === 'false') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailCookie = cookieStore.get('user-email')?.value
    const userRole = cookieStore.get('user-role')?.value || session || 'admin'
    const email = emailCookie ? decodeURIComponent(emailCookie) : (userRole === 'viewer' ? 'team@mis.isquarebpo.com' : 'admin@mis.isquarebpo.com')

    const { newPassword } = await request.json()
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const passwordHash = hashPassword(newPassword)

    const existing: any = await (prisma.profile as any).findFirst({
      where: { email }
    })

    if (existing) {
      await (prisma.profile as any).update({
        where: { id: existing.id },
        data: { passwordHash }
      })
    } else {
      await (prisma.profile as any).create({
        data: {
          email,
          name: email.split('@')[0],
          role: userRole,
          passwordHash,
        }
      })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error: any) {
    console.error('Password update error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update password' },
      { status: 500 }
    )
  }
}
