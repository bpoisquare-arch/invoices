import { NextResponse } from 'next/server'
import { ensureSeedData } from '@/lib/services/seed'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await ensureSeedData()
  return NextResponse.json(result)
}

export async function POST() {
  const result = await ensureSeedData()
  return NextResponse.json(result)
}
