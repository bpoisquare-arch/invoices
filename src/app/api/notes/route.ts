import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

// GET /api/notes - Fetch all notes with optional search & category filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''

    const where: any = {}

    if (category && category !== 'All') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      notes,
    })
  } catch (error: any) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)

    const body = await request.json().catch(() => ({}))
    const {
      title = 'Untitled Note',
      content = '',
      category = 'General',
      color = 'amber',
      isPinned = false,
    } = body

    const note = await prisma.note.create({
      data: {
        title: title || 'Untitled Note',
        content: content || '',
        category: category || 'General',
        color: color || 'amber',
        isPinned: Boolean(isPinned),
        userId: session?.userId || null,
        userEmail: session?.email || null,
      },
    })

    return NextResponse.json({
      success: true,
      note,
    })
  } catch (error: any) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create note' },
      { status: 500 }
    )
  }
}
