import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { getPendingRequests, approveRequest, rejectRequest } from '@/services/recurring.service'
import { sendRecurringApproved, sendRecurringRejected } from '@/services/notifications.service'
import { logActivity } from '@/services/activity-log.service'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export async function GET() {
  try {
    await requireAdmin()
    const requests = await getPendingRequests()
    return NextResponse.json({ requests })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const { id, action, admin_note } = await request.json()
    if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 })

    if (action === 'approve') {
      const result = await approveRequest(id, admin.id)

      let requesterName = 'משתמש'
      let roomLabel = ''
      // Send notification (best effort)
      try {
        const { createServiceClient } = await import('@/lib/supabase/server')
        const supabase = createServiceClient()
        const { data: req } = await supabase
          .from('recurring_booking_requests')
          .select('*, user:profiles!user_id(full_name, email), room:rooms!room_id(room_number)')
          .eq('id', id)
          .single()
        if (req?.user) requesterName = req.user.full_name ?? requesterName
        if (req?.room) roomLabel = req.room.room_number ?? ''
        if (req?.user && req?.room) {
          await sendRecurringApproved(
            req.user.email,
            req.user.full_name,
            req.room.room_number,
            DAY_NAMES[req.day_of_week] ?? '',
            result.created
          )
        }
      } catch { /* ignore */ }

      logActivity({
        actor: admin,
        action: 'admin.recurring.approved',
        entityType: 'recurring_booking_request',
        entityId: id,
        summary: `אישור בקשה קבועה של ${requesterName}${roomLabel ? ` (חדר ${roomLabel})` : ''} — ${result.created} הזמנות נוצרו`,
        details: { created: result.created },
      })

      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'reject') {
      await rejectRequest(id, admin.id, admin_note ?? '')

      let requesterName = 'משתמש'
      try {
        const { createServiceClient } = await import('@/lib/supabase/server')
        const supabase = createServiceClient()
        const { data: req } = await supabase
          .from('recurring_booking_requests')
          .select('*, user:profiles!user_id(full_name, email), room:rooms!room_id(room_number)')
          .eq('id', id)
          .single()
        if (req?.user) requesterName = req.user.full_name ?? requesterName
        if (req?.user && req?.room) {
          await sendRecurringRejected(req.user.email, req.user.full_name, req.room.room_number, admin_note ?? '')
        }
      } catch { /* ignore */ }

      logActivity({
        actor: admin,
        action: 'admin.recurring.rejected',
        entityType: 'recurring_booking_request',
        entityId: id,
        summary: `דחיית בקשה קבועה של ${requesterName}`,
        details: { admin_note: admin_note ?? null },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
