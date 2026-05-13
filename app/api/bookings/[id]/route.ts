import { NextResponse } from 'next/server'
import { getUser } from '@/services/auth.service'
import { cancelBooking, adminCancelBooking, getBookingById } from '@/services/bookings.service'
import { sendAdminCanceled } from '@/services/notifications.service'
import { logActivity } from '@/services/activity-log.service'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getUser()
    if (!profile || !profile.approved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const booking = await getBookingById(id)
    if (!booking) {
      return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 })
    }

    if (booking.user_id !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const roomLabel = booking.room
      ? `חדר ${booking.room.room_number}${booking.room.name ? ` (${booking.room.name})` : ''}`
      : 'חדר'
    const when = new Date(booking.start_time).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })

    if (profile.role === 'admin' && booking.user_id !== profile.id) {
      const canceled = await adminCancelBooking(id)
      await sendAdminCanceled(canceled).catch(console.error)
      const ownerName = booking.profile?.full_name ?? 'משתמש'
      logActivity({
        actor: profile,
        action: 'admin.booking.canceled',
        entityType: 'booking',
        entityId: id,
        summary: `ביטול הזמנה של ${ownerName}: ${roomLabel} בתאריך ${when}`,
        details: {
          owner_id: booking.user_id,
          owner_name: ownerName,
          room_id: booking.room_id,
          start_time: booking.start_time,
          end_time: booking.end_time,
        },
      })
    } else {
      await cancelBooking(id)
      logActivity({
        actor: profile,
        action: 'booking.canceled',
        entityType: 'booking',
        entityId: id,
        summary: `ביטול הזמנה: ${roomLabel} בתאריך ${when}`,
        details: {
          room_id: booking.room_id,
          start_time: booking.start_time,
          end_time: booking.end_time,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
