import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { getTemplates, createTemplate } from '@/services/schedules.service'
import { logActivity } from '@/services/activity-log.service'

export async function GET() {
  try {
    await requireAdmin()
    const templates = await getTemplates()
    return NextResponse.json({ templates })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const { name, school_type, periods } = await request.json()
    if (!name || !school_type || !Array.isArray(periods)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const template = await createTemplate(name, school_type, periods, admin.id)
    logActivity({
      actor: admin,
      action: 'admin.template.created',
      entityType: 'schedule_template',
      entityId: template.id,
      summary: `יצירת תבנית מערכת: ${name}`,
      details: { school_type, periods_count: periods.length },
    })
    return NextResponse.json({ template })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
