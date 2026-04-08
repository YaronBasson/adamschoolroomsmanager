import { NextResponse } from 'next/server'
import { getUser } from '@/services/auth.service'
import {
  createBooking,
  getUserBookings,
  autoCancelSwitchesForUser,
} from '@/services/bookings.service'
import {
  sendBookingConfirmed,
  sendSwitchAutoCanceled,
} from '@/services/notifications.service'
import type { CreateBookingInput } from '@/types/domain'

export async function GET() {
  try {
    const profile = await getUser()
    if (!profile || !profile.approved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const bookings = await getUserBookings(profile.id)
    return NextResponse.json({ bookings })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getUser()
    if (!profile || !profile.approved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateBookingInput = await request.json()

    // Validate times
    const start = new Date(body.start_time)
    const end = new Date(body.end_time)
    const now = new Date()

    if (start < now) {
      return NextResponse.json({ error: 'לא ניתן להזמין לתאריך או שעה שעברו' }, { status: 400 })
    }
    if (end <= start) {
      return NextResponse.json({ error: 'זמן הסיום חייב להיות אחרי זמן ההתחלה' }, { status: 400 })
    }

    // Auto-cancel pending switch requests where this user is requester
    const canceledSwitches = await autoCancelSwitchesForUser(profile.id)

    // Create the booking
    const booking = await createBooking(profile.id, body)

    // Send confirmation email
    await sendBookingConfirmed(booking).catch(console.error)

    // Notify target users of auto-canceled switches
    for (const sw of canceledSwitches) {
      if (sw.target_booking) {
        await sendSwitchAutoCanceled(sw, sw.target_booking).catch(console.error)
      }
    }

    return NextResponse.json({ booking }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message.includes('already booked')) {
      return NextResponse.json({ error: 'החדר תפוס בשעות אלו' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
