import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/services/activity-log.service'

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('booking_reasons')
      .insert({ name: name.trim() })
      .select()
      .single()
    if (error) throw error

    logActivity({
      actor: admin,
      action: 'admin.reason.created',
      entityType: 'booking_reason',
      entityId: data?.id,
      summary: `יצירת סיבת הזמנה: ${name.trim()}`,
    })

    return NextResponse.json({ reason: data }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
