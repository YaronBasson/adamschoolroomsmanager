import { getAllEvents, checkAndSendReminders } from '@/services/events.service'
import { createServiceClient } from '@/lib/supabase/server'
import EventsManager from '@/components/admin/EventsManager'

export default async function AdminEventsPage() {
  // Check and send reminders on page load (silent, non-blocking)
  checkAndSendReminders().catch(() => {})

  const [events, usersResult] = await Promise.all([
    getAllEvents(),
    createServiceClient().from('profiles').select('id, full_name, email').eq('approved', true).order('full_name'),
  ])

  const users = (usersResult.data ?? []) as { id: string; full_name: string; email: string }[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ארועי בית ספר</h1>
      <EventsManager events={events} users={users} />
    </div>
  )
}
