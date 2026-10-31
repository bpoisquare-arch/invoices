import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/notes/[id] - Fetch single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const note = await prisma.note.findUnique({
      where: { id },
    })

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, note })
  } catch (error: any) {
    console.error('Error fetching note:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch note' },
      { status: 500 }
    )
  }
}

// PATCH /api/notes/[id] - Update note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.category !== undefined) updateData.category = body.category
    if (body.color !== undefined) updateData.color = body.color
    if (body.isPinned !== undefined) updateData.isPinned = Boolean(body.isPinned)

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, note })
  } catch (error: any) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update note' },
      { status: 500 }
    )
  }
}

// DELETE /api/notes/[id] - Delete note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.note.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Note deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete note' },
      { status: 500 }
    )
  }
}
