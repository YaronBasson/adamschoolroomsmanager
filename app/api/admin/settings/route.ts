import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { getSchoolSettings, updateSchoolSetting } from '@/services/settings.service'
import { logActivity } from '@/services/activity-log.service'

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
    const admin = await requireAdmin()
    const body = await request.json()
    const allowed = ['school_year_start', 'school_year_end_primary', 'school_year_end_secondary']
    const updated: Record<string, string> = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key) && typeof value === 'string') {
        await updateSchoolSetting(key, value)
        updated[key] = value
      }
    }
    if (Object.keys(updated).length > 0) {
      logActivity({
        actor: admin,
        action: 'admin.settings.updated',
        entityType: 'school_setting',
        summary: `עדכון הגדרות מערכת (${Object.keys(updated).join(', ')})`,
        details: updated,
      })
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
