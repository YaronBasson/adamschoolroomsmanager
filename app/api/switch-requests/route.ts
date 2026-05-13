import { NextResponse } from 'next/server'
import { getUser } from '@/services/auth.service'
import { createSwitchRequest, getBookingById } from '@/services/bookings.service'
import { sendSwitchRequest } from '@/services/notifications.service'
import { logActivity } from '@/services/activity-log.service'

export async function POST(request: Request) {
  try {
    const profile = await getUser()
    if (!profile || !profile.approved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requester_booking_id, target_booking_id } = await request.json()

    if (!requester_booking_id || !target_booking_id) {
      return NextResponse.json({ error: 'Missing booking IDs' }, { status: 400 })
    }

    // Verify requester owns the booking
    const requesterBooking = await getBookingById(requester_booking_id)
    if (!requesterBooking || requesterBooking.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetBooking = await getBookingById(target_booking_id)
    if (!targetBooking) {
      return NextResponse.json({ error: 'Target booking not found' }, { status: 404 })
    }

    const switchRequest = await createSwitchRequest(requester_booking_id, target_booking_id)

    // Attach bookings for notification
    const srWithBookings = {
      ...switchRequest,
      requester_booking: requesterBooking,
      target_booking: targetBooking,
    }
    await sendSwitchRequest(srWithBookings, targetBooking).catch(console.error)

    const targetOwner = targetBooking.profile?.full_name ?? 'משתמש'
    logActivity({
      actor: profile,
      action: 'switch.requested',
      entityType: 'switch_request',
      entityId: switchRequest.id,
      summary: `בקשת החלפת חדר עם ${targetOwner}`,
      details: {
        requester_booking_id,
        target_booking_id,
        target_user_id: targetBooking.user_id,
      },
    })

    return NextResponse.json({ switchRequest }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
