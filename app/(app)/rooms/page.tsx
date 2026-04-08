import { getRooms } from '@/services/rooms.service'
import { getAllBookingsForDate } from '@/services/bookings.service'
import { getUser } from '@/services/auth.service'
import RoomGrid from '@/components/rooms/RoomGrid'

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function RoomsPage({ searchParams }: PageProps) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const { date: dateParam } = await searchParams
  const date = dateParam ?? today

  const [rooms, bookings, profile] = await Promise.all([
    getRooms(),
    getAllBookingsForDate(date),
    getUser(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">חדרים זמינים</h1>
      </div>
      <RoomGrid
        rooms={rooms}
        bookings={bookings}
        date={date}
        currentUserId={profile!.id}
        isAdmin={profile!.role === 'admin'}
      />
    </div>
  )
}
