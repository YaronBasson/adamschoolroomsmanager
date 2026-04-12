import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { getSchoolSettings, updateSchoolSetting } from '@/services/settings.service'

export async function GET() {
  try {
    await requireAdmin()
    const settings = await getSchoolSettings()
    return NextResponse.json({ settings })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const allowed = ['school_year_start', 'school_year_end_primary', 'school_year_end_secondary']
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key) && typeof value === 'string') {
        await updateSchoolSetting(key, value)
      }
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
