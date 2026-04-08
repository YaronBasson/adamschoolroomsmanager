import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Booking, CreateBookingInput, SwitchRequest } from '@/types/domain'

const BOOKING_SELECT = `
  *,
  profile:profiles(*),
  room:rooms(*),
  reason:booking_reasons(*)
`

export async function getUserBookings(userId: string): Promise<Booking[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as Booking[]
}

export async function getRoomBookings(
  roomId: string,
  from: string,
  to: string
): Promise<Booking[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('room_id', roomId)
    .eq('status', 'active')
    .gte('start_time', from)
    .lte('end_time', to)
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as Booking[]
}

export async function getAllBookingsForDate(date: string): Promise<Booking[]> {
  const supabase = await createClient()
  // Use Israel timezone offset — IDT is UTC+3, IST is UTC+2
  // We query a wide enough window to always cover the full Israel day
  const dayStart = new Date(`${date}T00:00:00+03:00`).toISOString()
  const dayEnd = new Date(`${date}T23:59:59+03:00`).toISOString()
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('status', 'active')
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
    .order('start_time', { ascending: true })
  if (error) throw error
  return (data ?? []) as Booking[]
}

export async function createBooking(
  userId: string,
  input: CreateBookingInput
): Promise<Booking> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...input, user_id: userId })
    .select(BOOKING_SELECT)
    .single()
  if (error) throw error
  return data as Booking
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'canceled' })
    .eq('id', bookingId)
  if (error) throw error

  // Cancel any pending switch requests involving this booking
  const serviceSupabase = createServiceClient()
  await serviceSupabase
    .from('switch_requests')
    .update({ status: 'canceled' })
    .eq('status', 'pending')
    .or(`requester_booking_id.eq.${bookingId},target_booking_id.eq.${bookingId}`)
}

export async function adminCancelBooking(bookingId: string): Promise<Booking> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'canceled' })
    .eq('id', bookingId)
    .select(BOOKING_SELECT)
    .single()
  if (error) throw error

  // Cancel pending switch requests
  await supabase
    .from('switch_requests')
    .update({ status: 'canceled' })
    .eq('status', 'pending')
    .or(`requester_booking_id.eq.${bookingId},target_booking_id.eq.${bookingId}`)

  return data as Booking
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', id)
    .single()
  if (error) return null
  return data as Booking
}

// ---- Switch Requests ----

export async function getPendingSwitchForBooking(
  bookingId: string
): Promise<SwitchRequest | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('switch_requests')
    .select('*, requester_booking:bookings!requester_booking_id(*), target_booking:bookings!target_booking_id(*)')
    .eq('status', 'pending')
    .or(`requester_booking_id.eq.${bookingId},target_booking_id.eq.${bookingId}`)
    .maybeSingle()
  return (data as SwitchRequest) ?? null
}

export async function createSwitchRequest(
  requesterBookingId: string,
  targetBookingId: string
): Promise<SwitchRequest> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('switch_requests')
    .insert({
      requester_booking_id: requesterBookingId,
      target_booking_id: targetBookingId,
    })
    .select()
    .single()
  if (error) throw error
  return data as SwitchRequest
}

export async function approveSwitchRequest(switchRequestId: string): Promise<void> {
  const supabase = createServiceClient()

  // Get the switch request with bookings
  const { data: sr, error: srError } = await supabase
    .from('switch_requests')
    .select('*, requester_booking:bookings!requester_booking_id(*), target_booking:bookings!target_booking_id(*)')
    .eq('id', switchRequestId)
    .single()
  if (srError || !sr) throw srError ?? new Error('Switch request not found')

  const req = sr.requester_booking as Booking
  const tgt = sr.target_booking as Booking

  // Swap room_id between the two bookings
  await supabase.from('bookings').update({ room_id: tgt.room_id }).eq('id', req.id)
  await supabase.from('bookings').update({ room_id: req.room_id }).eq('id', tgt.id)

  // Mark switch as approved
  await supabase
    .from('switch_requests')
    .update({ status: 'approved' })
    .eq('id', switchRequestId)
}

export async function cancelSwitchRequest(switchRequestId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('switch_requests')
    .update({ status: 'canceled' })
    .eq('id', switchRequestId)
  if (error) throw error
}

/**
 * When a user creates a new booking, auto-cancel any pending switch requests
 * where they are the requester.
 */
export async function autoCancelSwitchesForUser(userId: string): Promise<SwitchRequest[]> {
  const supabase = createServiceClient()

  // Find pending switch requests where user is requester
  const { data: userBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (!userBookings || userBookings.length === 0) return []

  const bookingIds = userBookings.map((b) => b.id)

  const { data: pendingSwitches } = await supabase
    .from('switch_requests')
    .select('*, requester_booking:bookings!requester_booking_id(*), target_booking:bookings!target_booking_id(*)')
    .eq('status', 'pending')
    .in('requester_booking_id', bookingIds)

  if (!pendingSwitches || pendingSwitches.length === 0) return []

  // Cancel them
  await supabase
    .from('switch_requests')
    .update({ status: 'canceled' })
    .in('id', pendingSwitches.map((s) => s.id))

  return pendingSwitches as SwitchRequest[]
}
