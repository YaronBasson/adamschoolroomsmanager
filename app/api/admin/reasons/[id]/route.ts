import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/services/activity-log.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('booking_reasons')
      .update(body)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    logActivity({
      actor: admin,
      action: 'admin.reason.updated',
      entityType: 'booking_reason',
      entityId: id,
      summary: `עדכון סיבת הזמנה: ${data?.name ?? id}`,
      details: { changes: body },
    })
    return NextResponse.json({ reason: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
