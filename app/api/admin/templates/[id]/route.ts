import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { updateTemplatePeriods, deleteTemplate } from '@/services/schedules.service'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
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
    await requireAdmin()
    const { id } = await params
    await deleteTemplate(id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
