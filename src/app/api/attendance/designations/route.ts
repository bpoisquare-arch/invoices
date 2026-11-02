import { NextRequest, NextResponse } from 'next/server'
import { getAllDesignations, addCustomDesignation } from '@/lib/services/designation-storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const designations = await getAllDesignations()
    return NextResponse.json({ success: true, designations })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch designations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { designation } = body

    if (!designation || typeof designation !== 'string' || !designation.trim()) {
      return NextResponse.json(
        { success: false, error: 'Designation name is required.' },
        { status: 400 }
      )
    }

    const result = await addCustomDesignation(designation)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to add designation.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      added: result.added,
      designations: result.designations,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to add designation' },
      { status: 500 }
    )
  }
}
