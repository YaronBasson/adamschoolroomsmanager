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
  responsible_user?: { id: string; full_name: string; email: string } | null
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
