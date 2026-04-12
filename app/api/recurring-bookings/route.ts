import { NextResponse } from 'next/server'
import { requireApprovedUser } from '@/services/auth.service'
import { createRecurringRequest } from '@/services/recurring.service'

export async function POST(request: Request) {
  try {
    const user = await requireApprovedUser()
    const body = await request.json()

    const { room_id, reason_id, reason_text, day_of_week, start_period, end_period, school_type, start_date, end_date } = body

    if (!room_id || day_of_week == null || !start_period || !end_period || !school_type || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (start_period > end_period) {
      return NextResponse.json({ error: 'Start period must be before end period' }, { status: 400 })
    }

    const req = await createRecurringRequest(user.id, {
      room_id,
      reason_id,
      reason_text,
      day_of_week,
      start_period,
      end_period,
      school_type,
      start_date,
      end_date,
    })

    return NextResponse.json({ request: req }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
