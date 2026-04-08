import { NextResponse } from 'next/server'
import { getUser } from '@/services/auth.service'
import {
  approveSwitchRequest,
  cancelSwitchRequest,
  getBookingById,
} from '@/services/bookings.service'
import { sendSwitchApproved } from '@/services/notifications.service'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getUser()
    if (!profile || !profile.approved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { action } = await request.json()
    if (action !== 'approve' && action !== 'cancel') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: sr } = await supabase
      .from('switch_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!sr) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (sr.status !== 'pending') {
      return NextResponse.json({ error: 'Switch request is no longer pending' }, { status: 409 })
    }

    if (action === 'approve') {
      const targetBooking = await getBookingById(sr.target_booking_id)
      if (!targetBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      if (targetBooking.user_id !== profile.id && profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      await approveSwitchRequest(id)

      const requesterBooking = await getBookingById(sr.requester_booking_id)
      if (requesterBooking && targetBooking) {
        await sendSwitchApproved(requesterBooking, targetBooking).catch(console.error)
      }
    } else {
      const [requesterBooking, targetBooking] = await Promise.all([
        getBookingById(sr.requester_booking_id),
        getBookingById(sr.target_booking_id),
      ])
      const isInvolved =
        requesterBooking?.user_id === profile.id ||
        targetBooking?.user_id === profile.id ||
        profile.role === 'admin'
      if (!isInvolved) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      await cancelSwitchRequest(id)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
