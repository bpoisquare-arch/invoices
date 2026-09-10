import { NextRequest, NextResponse } from 'next/server'
import { getReportRecords, getReportImports } from '@/lib/services/report.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'records' or 'imports'

    if (type === 'imports') {
      const entity = searchParams.get('entity') || 'aimt'
      const imports = await getReportImports(entity)
      return NextResponse.json({ success: true, imports })
    }

    const importId = searchParams.get('importId') || undefined
    const search = searchParams.get('search') || undefined
    const agent = searchParams.get('agent') || undefined
    const intake = searchParams.get('intake') || undefined
    const course = searchParams.get('course') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const sortBy = (searchParams.get('sortBy') as any) || 'sr_no'
    const sortOrder = (searchParams.get('sortOrder') as any) || 'asc'

    const result = await getReportRecords({
      importId,
      search,
      agent,
      intake,
      course,
      page,
      pageSize,
      sortBy,
      sortOrder,
    })

    return NextResponse.json({
      success: true,
      ...result,
      page,
      pageSize,
    })
  } catch (error: any) {
    console.error('Error in GET /api/reports:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
