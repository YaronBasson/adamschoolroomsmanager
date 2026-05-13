import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { updateTemplatePeriods, deleteTemplate } from '@/services/schedules.service'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/services/activity-log.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const { name, periods } = await request.json()

    // Update periods (with cascade cancellation logic)
    let template
    if (Array.isArray(periods)) {
      template = await updateTemplatePeriods(id, periods)
    } else {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      template = data
    }

    // Update name if provided
    if (typeof name === 'string') {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('schedule_templates')
        .update({ name })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      template = data
    }

    logActivity({
      actor: admin,
      action: 'admin.template.updated',
      entityType: 'schedule_template',
      entityId: id,
      summary: `עדכון תבנית מערכת: ${template?.name ?? id}`,
      details: {
        name_changed: typeof name === 'string',
        periods_changed: Array.isArray(periods),
        periods_count: Array.isArray(periods) ? periods.length : undefined,
      },
    })

    return NextResponse.json({ template })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from('schedule_templates')
      .select('name')
      .eq('id', id)
      .single()
    await deleteTemplate(id)
    logActivity({
      actor: admin,
      action: 'admin.template.deleted',
      entityType: 'schedule_template',
      entityId: id,
      summary: `מחיקת תבנית מערכת: ${existing?.name ?? id}`,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
