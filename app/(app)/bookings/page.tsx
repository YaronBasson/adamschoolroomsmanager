import { getUser } from '@/services/auth.service'
import { getUserBookings } from '@/services/bookings.service'
import BookingList from '@/components/bookings/BookingList'

export default async function BookingsPage() {
  const profile = await getUser()
  const bookings = await getUserBookings(profile!.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ההזמנות שלי</h1>
      <BookingList bookings={bookings} />
    </div>
  )
}
