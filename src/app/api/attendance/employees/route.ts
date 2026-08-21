import { NextRequest, NextResponse } from 'next/server'
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  checkDuplicateEmployeeName,
} from '@/lib/services/attendance.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const checkName = searchParams.get('checkName')

    if (checkName) {
      const dup = await checkDuplicateEmployeeName(checkName)
      return NextResponse.json(dup)
    }

    const employees = await getEmployees({ search, isActiveOnly: false })
    return NextResponse.json({ success: true, employees })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, designation, branch, salary, joining_date } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Employee name is required.' }, { status: 400 })
    }

    if (!designation || typeof designation !== 'string' || !designation.trim()) {
      return NextResponse.json({ success: false, error: 'Designation is required.' }, { status: 400 })
    }

    const result = await createEmployee({
      name: name.trim(),
      designation: designation.trim(),
      branch,
      salary,
      joining_date,
    })

    return NextResponse.json({
      success: true,
      employee: result.employee,
      warning: result.warning,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, designation, branch, salary, joining_date, is_active } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 })
    }

    const updated = await updateEmployee(id, {
      name,
      designation,
      branch,
      salary,
      joining_date,
      is_active,
    })

    return NextResponse.json({ success: true, employee: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Employee ID is required.' }, { status: 400 })
    }

    const { deleteEmployee } = await import('@/lib/services/attendance.service')
    await deleteEmployee(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
