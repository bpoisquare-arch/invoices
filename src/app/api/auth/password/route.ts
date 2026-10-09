import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)

    if (!session || !session.email) {
      return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 })
    }

    const email = session.email
    const userRole = session.role

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const existing: any = await (prisma.profile as any).findFirst({
      where: { email }
    })

    // Require current password verification to prevent account takeover
    if (existing && existing.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change your password.' },
          { status: 400 }
        )
      }
      if (!verifyPassword(currentPassword, existing.passwordHash)) {
        return NextResponse.json(
          { error: 'Incorrect current password.' },
          { status: 403 }
        )
      }
    }

    const passwordHash = hashPassword(newPassword)

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
