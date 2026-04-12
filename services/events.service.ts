import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/domain'

export interface SchoolEvent {
  id: string
  title: string
  event_date: string | null
  school_type: 'יסודי' | 'תיכון' | 'שניהם' | null
  description: string | null
  responsible_user_id: string | null
  classes: string[]
  booking_ids: string[]
  reminder_sent: boolean
  created_by: string | null
  created_at: string
  responsible_user?: Pick<Profile, 'id' | 'full_name' | 'email'> | null
}

export type EventStatus = 'green' | 'orange' | 'gray'

export function getEventStatus(event: SchoolEvent): EventStatus {
  if (event.booking_ids.length > 0) return 'green'
  if (!event.event_date) return 'gray'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(event.event_date)
  const diff = (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

  if (diff >= 0 && diff <= 7) return 'orange'
  return 'gray'
}

export async function getEventsByMonth(year: number, month: number): Promise<SchoolEvent[]> {
  const supabase = createServiceClient()
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const { data, error } = await supabase
    .from('school_events')
    .select('*, responsible_user:profiles!responsible_user_id(id, full_name, email)')
    .or(`event_date.is.null,and(event_date.gte.${from},event_date.lte.${to})`)
    .order('event_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as SchoolEvent[]
}

export async function getAllEvents(): Promise<SchoolEvent[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('school_events')
    .select('*, responsible_user:profiles!responsible_user_id(id, full_name, email)')
    .order('event_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as SchoolEvent[]
}

export async function createEvent(input: Partial<SchoolEvent>, createdBy: string): Promise<SchoolEvent> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('school_events')
    .insert({ ...input, created_by: createdBy })
    .select('*, responsible_user:profiles!responsible_user_id(id, full_name, email)')
    .single()
  if (error) throw error
  return data as SchoolEvent
}

export async function updateEvent(id: string, updates: Partial<SchoolEvent>): Promise<SchoolEvent> {
  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, created_by: _cb, responsible_user: _ru, ...fields } = updates
  const { data, error } = await supabase
    .from('school_events')
    .update(fields)
    .eq('id', id)
    .select('*, responsible_user:profiles!responsible_user_id(id, full_name, email)')
    .single()
  if (error) throw error
  return data as SchoolEvent
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('school_events').delete().eq('id', id)
  if (error) throw error
}

export async function checkAndSendReminders(): Promise<void> {
  const { sendEventReminder } = await import('@/services/notifications.service')
  const supabase = createServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)

  const { data: events } = await supabase
    .from('school_events')
    .select('*, responsible_user:profiles!responsible_user_id(id, full_name, email)')
    .eq('reminder_sent', false)
    .gte('event_date', today.toISOString().split('T')[0])
    .lte('event_date', in7Days.toISOString().split('T')[0])
    .eq('booking_ids', '{}')

  if (!events || events.length === 0) return

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'admin')

  for (const event of events as SchoolEvent[]) {
    try {
      await sendEventReminder(event, (admins ?? []) as Profile[])
      await supabase
        .from('school_events')
        .update({ reminder_sent: true })
        .eq('id', event.id)
    } catch { /* don't fail page load if email fails */ }
  }
}
