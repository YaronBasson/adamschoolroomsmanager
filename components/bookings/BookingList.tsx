'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Booking } from '@/types/domain'

interface BookingListProps {
  bookings: Booking[]
}

export default function BookingList({ bookings }: BookingListProps) {
  const router = useRouter()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function handleCancel(bookingId: string) {
    if (!confirm('לבטל את ההזמנה?')) return
    setCancellingId(bookingId)

    const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
    setCancellingId(null)

    if (res.ok) {
      router.refresh()
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg mb-2">אין הזמנות פעילות</p>
        <a href="/rooms" className="text-brand-600 hover:underline text-sm">
          לחפש חדר זמין
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                קומה {booking.room?.floor}, חדר {booking.room?.room_number}
              </span>
              {booking.room?.equipment && booking.room.equipment.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {booking.room.equipment.slice(0, 2).map((eq) => (
                    <span key={eq} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {eq}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {new Date(booking.start_time).toLocaleDateString('he-IL', {
                weekday: 'short', day: 'numeric', month: 'short'
              })}
              {' | '}
              {new Date(booking.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {new Date(booking.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {(booking.reason?.name || booking.reason_text) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {booking.reason?.name ?? booking.reason_text}
              </p>
            )}
          </div>

          <button
            onClick={() => handleCancel(booking.id)}
            disabled={cancellingId === booking.id}
            className="text-sm text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {cancellingId === booking.id ? 'מבטל...' : 'בטל'}
          </button>
        </div>
      ))}
    </div>
  )
}
