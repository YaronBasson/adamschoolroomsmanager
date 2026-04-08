import { NextResponse } from 'next/server'
import { getUser } from '@/services/auth.service'
import { cancelBooking, adminCancelBooking, getBookingById } from '@/services/bookings.service'
import { sendAdminCanceled } from '@/services/notifications.service'

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

    if (profile.role === 'admin' && booking.user_id !== profile.id) {
      const canceled = await adminCancelBooking(id)
      await sendAdminCanceled(canceled).catch(console.error)
    } else {
      await cancelBooking(id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
