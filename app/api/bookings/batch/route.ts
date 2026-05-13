import { NextResponse } from 'next/server'
import { getUser } from '@/services/auth.service'
import { createBooking, autoCancelSwitchesForUser } from '@/services/bookings.service'
import { sendBookingConfirmed } from '@/services/notifications.service'
import { logActivity } from '@/services/activity-log.service'

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export async function POST(request: Request) {
  try {
    const profile = await getUser()
    if (!profile || !profile.approved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { room_id, reason_id, reason_text, start_date, end_date, start_time, end_time } = body

    if (!room_id || !start_date || !end_date || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate times make sense within a day
    const [sh, sm] = (start_time as string).split(':').map(Number)
    const [eh, em] = (end_time as string).split(':').map(Number)
    if (eh * 60 + em <= sh * 60 + sm) {
      return NextResponse.json({ error: 'זמן הסיום חייב להיות אחרי זמן ההתחלה' }, { status: 400 })
    }

    const now = new Date()
    const dates = getDatesInRange(start_date, end_date)

    // Auto-cancel pending switch requests once before creating any bookings
    await autoCancelSwitchesForUser(profile.id)

    let created = 0
    const skipped: string[] = []

    for (const date of dates) {
      // Use +03:00 (Israel time) consistent with server-side booking generation
      const start = new Date(`${date}T${start_time}:00+03:00`)
      const endDt = new Date(`${date}T${end_time}:00+03:00`)

      if (start < now) {
        skipped.push(date)
        continue
      }

      try {
        const booking = await createBooking(profile.id, {
          room_id,
          reason_id,
          reason_text,
          start_time: start.toISOString(),
          end_time: endDt.toISOString(),
        })
        sendBookingConfirmed(booking).catch(console.error)
        created++
      } catch {
        skipped.push(date)
      }
    }

    if (created > 0) {
      logActivity({
        actor: profile,
        action: 'booking.batch_created',
        entityType: 'booking',
        entityId: room_id,
        summary: `יצירת ${created} הזמנות (${start_date} עד ${end_date}, ${start_time}–${end_time})`,
        details: {
          room_id,
          start_date,
          end_date,
          start_time,
          end_time,
          created,
          skipped,
        },
      })
    }

    return NextResponse.json({ created, skipped }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
