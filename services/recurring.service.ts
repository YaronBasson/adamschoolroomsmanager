import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Profile, Room } from '@/types/domain'
import { PERIODS, type SchoolType } from '@/lib/school-periods'
import { getSchoolSettings } from '@/services/settings.service'

export interface RecurringRequest {
  id: string
  user_id: string
  room_id: string
  reason_id: string | null
  reason_text: string | null
  day_of_week: number      // 0=Sun … 5=Fri
  start_period: number
  end_period: number
  school_type: SchoolType
  start_date: string       // YYYY-MM-DD
  end_date: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  // joined
  user?: Pick<Profile, 'id' | 'full_name' | 'email'>
  room?: Pick<Room, 'id' | 'room_number' | 'name' | 'floor' | 'building'>
}

const SELECT = `
  *,
  user:profiles!user_id(id, full_name, email),
  room:rooms!room_id(id, room_number, name, floor, building)
`

export async function getPendingRequests(): Promise<RecurringRequest[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('recurring_booking_requests')
    .select(SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as RecurringRequest[]
}

export async function getAllRequests(): Promise<RecurringRequest[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('recurring_booking_requests')
    .select(SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as RecurringRequest[]
}

export async function getUserRequests(userId: string): Promise<RecurringRequest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recurring_booking_requests')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as RecurringRequest[]
}

export async function createRecurringRequest(
  userId: string,
  input: {
    room_id: string
    reason_id?: string
    reason_text?: string
    day_of_week: number
    start_period: number
    end_period: number
    school_type: SchoolType
    start_date: string
    end_date?: string
  }
): Promise<RecurringRequest> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recurring_booking_requests')
    .insert({ ...input, user_id: userId })
    .select(SELECT)
    .single()
  if (error) throw error
  return data as RecurringRequest
}

interface ApproveResult {
  created: number
  skipped: number   // conflicts
}

export async function approveRequest(
  requestId: string,
  adminId: string
): Promise<ApproveResult> {
  const supabase = createServiceClient()

  const { data: req, error } = await supabase
    .from('recurring_booking_requests')
    .select(SELECT)
    .eq('id', requestId)
    .single()
  if (error || !req) throw new Error('Request not found')

  const request = req as RecurringRequest
  const settings = await getSchoolSettings()

  // Determine end date
  const yearEnd = request.school_type === 'תיכון'
    ? settings.school_year_end_secondary
    : settings.school_year_end_primary

  const endDate = request.end_date
    ? (request.end_date < yearEnd ? request.end_date : yearEnd)
    : yearEnd

  // Get period times
  const periodDefs = PERIODS[request.school_type]
  const startPeriodDef = periodDefs.find(p => p.number === request.start_period)
  const endPeriodDef = periodDefs.find(p => p.number === request.end_period)
  if (!startPeriodDef || !endPeriodDef) throw new Error('Invalid period numbers')

  // Generate dates for the recurrence
  const dates = generateDates(request.start_date, endDate, request.day_of_week)

  // Build ISO start/end times for each date
  const slots = dates.map(date => ({
    start: `${date}T${startPeriodDef.start}:00+03:00`,
    end: `${date}T${endPeriodDef.end}:00+03:00`,
  }))

  // Check for conflicts
  const startTimes = slots.map(s => s.start)
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('start_time')
    .eq('room_id', request.room_id)
    .eq('status', 'active')
    .in('start_time', startTimes)

  const conflictSet = new Set((conflicts ?? []).map((c: { start_time: string }) => c.start_time))

  const toInsert = slots
    .filter(s => !conflictSet.has(s.start))
    .map(s => ({
      user_id: request.user_id,
      room_id: request.room_id,
      reason_id: request.reason_id ?? null,
      reason_text: request.reason_text ?? null,
      start_time: s.start,
      end_time: s.end,
      status: 'active',
    }))

  if (toInsert.length > 0) {
    // Insert in batches
    for (let i = 0; i < toInsert.length; i += 500) {
      await supabase.from('bookings').insert(toInsert.slice(i, i + 500))
    }
  }

  // Mark request as approved
  await supabase
    .from('recurring_booking_requests')
    .update({ status: 'approved', approved_by: adminId, approved_at: new Date().toISOString() })
    .eq('id', requestId)

  return { created: toInsert.length, skipped: slots.length - toInsert.length }
}

export async function rejectRequest(
  requestId: string,
  adminId: string,
  adminNote: string
): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('recurring_booking_requests')
    .update({ status: 'rejected', approved_by: adminId, admin_note: adminNote })
    .eq('id', requestId)
}

function generateDates(startDate: string, endDate: string, dayOfWeek: number): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  // Advance to the first matching day of week
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1)
  }

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 7)
  }

  return dates
}
