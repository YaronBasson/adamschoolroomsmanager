import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { updateRoom } from '@/services/rooms.service'
import { createServiceClient } from '@/lib/supabase/server'
import { sendRoomDeleted } from '@/services/notifications.service'
import { logActivity } from '@/services/activity-log.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const room = await updateRoom(id, body)
    logActivity({
      actor: admin,
      action: 'admin.room.updated',
      entityType: 'room',
      entityId: id,
      summary: `עדכון חדר: ${room.room_number}${room.name ? ` (${room.name})` : ''}`,
      details: { changes: body },
    })
    return NextResponse.json({ room })
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

    // Fetch room label before deletion (for the activity log)
    const { data: roomRow } = await supabase
      .from('rooms')
      .select('room_number, name')
      .eq('id', id)
      .single()
    const roomLabel = roomRow
      ? `${roomRow.room_number}${roomRow.name ? ` (${roomRow.name})` : ''}`
      : id

    // Fetch active future bookings + user emails before deletion
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, profile:profiles(full_name, email), room:rooms(room_number, name)')
      .eq('room_id', id)
      .eq('status', 'active')
      .gte('start_time', new Date().toISOString())

    // Delete room — bookings are cascade-deleted automatically (ON DELETE CASCADE)
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) throw error

    // Notify affected users (best effort, after deletion)
    if (activeBookings && activeBookings.length > 0) {
      const notifications = activeBookings.map((b: any) => {
        const email = b.profile?.email
        const name = b.profile?.full_name ?? ''
        const roomLabel = b.room?.name
          ? `${b.room.room_number} — ${b.room.name}`
          : b.room?.room_number ?? id
        if (!email) return Promise.resolve()
        return sendRoomDeleted(email, name, roomLabel, b.start_time, b.end_time).catch(() => {})
      })
      await Promise.all(notifications)
    }

    logActivity({
      actor: admin,
      action: 'admin.room.deleted',
      entityType: 'room',
      entityId: id,
      summary: `מחיקת חדר: ${roomLabel}`,
      details: { notified: activeBookings?.length ?? 0 },
    })

    return NextResponse.json({ success: true, notified: activeBookings?.length ?? 0 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
