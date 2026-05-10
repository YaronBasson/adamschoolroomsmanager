import { getRooms } from '@/services/rooms.service'
import { getAllBookingsForDate } from '@/services/bookings.service'
import { getUser } from '@/services/auth.service'
import { getAllRoomSchedules, getTemplates } from '@/services/schedules.service'
import RoomOverview from '@/components/rooms/RoomOverview'

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function RoomsOverviewPage({ searchParams }: PageProps) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const { date: dateParam } = await searchParams
  const date = dateParam ?? today

  const [rooms, bookings, profile, roomSchedules, templates] = await Promise.all([
    getRooms(),
    getAllBookingsForDate(date),
    getUser(),
    getAllRoomSchedules(),
    getTemplates(),
  ])

  return (
    <RoomOverview
      rooms={rooms}
      bookings={bookings}
      roomSchedules={roomSchedules}
      templates={templates}
      date={date}
      currentUserId={profile!.id}
      isAdmin={profile!.role === 'admin'}
    />
  )
}
