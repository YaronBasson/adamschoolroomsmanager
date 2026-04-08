'use client'

import { useState } from 'react'
import type { Booking } from '@/types/domain'

interface SwitchRequestModalProps {
  targetBooking: Booking
  onClose: () => void
  onSuccess: () => void
}

export default function SwitchRequestModal({ targetBooking, onClose, onSuccess }: SwitchRequestModalProps) {
  const [myBookingId, setMyBookingId] = useState('')
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [error, setError] = useState('')
  const [warned, setWarned] = useState(false)

  async function loadMyBookings() {
    setLoadingBookings(true)
    const res = await fetch('/api/bookings')
    const data = await res.json()
    setMyBookings(data.bookings ?? [])
    setLoadingBookings(false)
  }

  useState(() => {
    loadMyBookings()
  })

  // Need to call useEffect instead
  // eslint-disable-next-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!warned) {
      setWarned(true)
      return
    }
    setError('')
    setLoading(true)

    const res = await fetch('/api/switch-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requester_booking_id: myBookingId,
        target_booking_id: targetBooking.id,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'שגיאה בבקשת ההחלפה')
      setLoading(false)
      return
    }

    onSuccess()
  }

  const targetRoom = targetBooking.room
  const targetUser = targetBooking.profile

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">בקשת החלפת חדר</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-5">
          <p className="text-sm font-medium text-orange-800">החדר המבוקש:</p>
          <p className="text-sm text-orange-700">
            קומה {targetRoom?.floor}, חדר {targetRoom?.room_number} — {targetUser?.full_name}
          </p>
          <p className="text-sm text-orange-700">
            {new Date(targetBooking.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {new Date(targetBooking.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ההזמנה שלי להחלפה</label>
            {loadingBookings ? (
              <p className="text-sm text-gray-400">טוען...</p>
            ) : (
              <select
                value={myBookingId}
                onChange={(e) => setMyBookingId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">בחר הזמנה...</option>
                {myBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    חדר {b.room?.room_number} |{' '}
                    {new Date(b.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(b.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </option>
                ))}
              </select>
            )}
          </div>

          {warned && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium">שים לב!</p>
              <p className="text-sm text-yellow-700">
                אם תאשר, תישלח בקשת החלפה ל-{targetUser?.full_name}.
                אם תזמין חדר אחר לפני שהם יאשרו, הבקשה תבוטל אוטומטית.
              </p>
              <p className="text-sm text-yellow-700 mt-1">לחץ שוב לאישור.</p>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'שולח...' : warned ? 'אשר שליחה' : 'שלח בקשה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
