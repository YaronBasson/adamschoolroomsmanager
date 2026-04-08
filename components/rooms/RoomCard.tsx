'use client'

import type { Room, Booking } from '@/types/domain'

interface RoomCardProps {
  room: Room
  bookings: Booking[]
  currentUserId: string
  isAdmin: boolean
  onBook: () => void
  onSwitchRequest: (booking: Booking) => void
}

export default function RoomCard({
  room,
  bookings,
  currentUserId,
  isAdmin,
  onBook,
  onSwitchRequest,
}: RoomCardProps) {
  const now = new Date()

  const activeBookings = bookings.filter((b) => b.status === 'active')
  const currentBooking = activeBookings.find(
    (b) => new Date(b.start_time) <= now && new Date(b.end_time) >= now
  )
  const isOccupied = !!currentBooking
  const isMyBooking = currentBooking?.user_id === currentUserId

  const equipmentLabels: Record<string, string> = {
    piano: 'פסנתר',
    projector: 'מקרן',
    dance_floor: 'רצפת ריקוד',
    whiteboard: 'לוח',
    computers: 'מחשבים',
    sound_system: 'מערכת שמע',
  }

  return (
    <div
      className={`
        bg-white rounded-xl border-2 p-4 transition-all
        ${isOccupied
          ? isMyBooking
            ? 'border-brand-400 bg-brand-50'
            : 'border-orange-300 bg-orange-50'
          : 'border-green-300 bg-green-50 cursor-pointer hover:shadow-md hover:border-green-500'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">חדר {room.room_number}</h3>
          <p className="text-sm text-gray-500">קיבולת: {room.capacity} אנשים</p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            isOccupied
              ? isMyBooking
                ? 'bg-brand-100 text-brand-700'
                : 'bg-orange-100 text-orange-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {isOccupied ? (isMyBooking ? 'שלי' : 'תפוס') : 'פנוי'}
        </span>
      </div>

      {(room.equipment ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(room.equipment ?? []).map((eq) => (
            <span key={eq} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {equipmentLabels[eq] ?? eq}
            </span>
          ))}
        </div>
      )}

      {/* Today's bookings timeline */}
      {activeBookings.length > 0 && (
        <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
          {activeBookings.slice(0, 3).map((b) => (
            <div key={b.id} className="flex items-center justify-between text-xs text-gray-600">
              <span>
                {new Date(b.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(b.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-gray-400 truncate max-w-[100px]">
                {b.profile?.full_name ?? ''}
              </span>
            </div>
          ))}
          {activeBookings.length > 3 && (
            <p className="text-xs text-gray-400">+{activeBookings.length - 3} נוספים</p>
          )}
        </div>
      )}

      {/* Action button */}
      <div className="mt-3">
        {!isOccupied ? (
          <button
            onClick={onBook}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
          >
            הזמן חדר
          </button>
        ) : !isMyBooking ? (
          <button
            onClick={() => onSwitchRequest(currentBooking!)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
          >
            בקש החלפה
          </button>
        ) : null}
      </div>
    </div>
  )
}
