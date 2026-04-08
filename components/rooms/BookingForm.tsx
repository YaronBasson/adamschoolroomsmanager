'use client'

import { useState, useEffect } from 'react'
import type { Room, BookingReason } from '@/types/domain'

interface BookingFormProps {
  room: Room
  defaultStartDate: string
  onClose: () => void
  onSuccess: () => void
}

export default function BookingForm({ room, defaultStartDate, onClose, onSuccess }: BookingFormProps) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const [reasons, setReasons] = useState<BookingReason[]>([])
  const [selectedReasonId, setSelectedReasonId] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [startDate, setStartDate] = useState(defaultStartDate < today ? today : defaultStartDate)
  const [startTime, setStartTime] = useState('08:00')
  const [endDate, setEndDate] = useState(defaultStartDate < today ? today : defaultStartDate)
  const [endTime, setEndTime] = useState('09:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/booking-reasons').then((r) => r.json()).then(setReasons)
  }, [])

  // Keep end date >= start date
  function handleStartDateChange(val: string) {
    setStartDate(val)
    if (val > endDate) setEndDate(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const start = new Date(`${startDate}T${startTime}:00`)
    const end = new Date(`${endDate}T${endTime}:00`)
    const now = new Date()

    if (start < now) {
      setError('לא ניתן להזמין לתאריך או שעה שעברו')
      return
    }

    if (end <= start) {
      setError('זמן הסיום חייב להיות אחרי זמן ההתחלה')
      return
    }

    setLoading(true)

    const body = {
      room_id: room.id,
      reason_id: selectedReasonId && selectedReasonId !== '__custom__' ? selectedReasonId : undefined,
      reason_text: selectedReasonId === '__custom__' ? customReason : undefined,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    }

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'שגיאה ביצירת ההזמנה')
      setLoading(false)
      return
    }

    onSuccess()
  }

  const isMultiDay = startDate !== endDate

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            הזמנת חדר {room.room_number}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <p className="text-sm text-gray-500 mb-5">קומה {room.floor}</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Start row */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">התחלה</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">תאריך</label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  dir="ltr"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-600 mb-1">שעה</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* End row */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">סיום</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">תאריך</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  dir="ltr"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-600 mb-1">שעה</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {isMultiDay && (
            <p className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
              הזמנה מרובת ימים: {startDate} עד {endDate}
            </p>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיבה</label>
            <select
              value={selectedReasonId}
              onChange={(e) => setSelectedReasonId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">בחר סיבה...</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
              <option value="__custom__">אחר (הזן סיבה חדשה)</option>
            </select>
          </div>

          {selectedReasonId === '__custom__' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיבה מותאמת אישית</label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
                placeholder="פרט את הסיבה..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
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
              className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'מזמין...' : 'אשר הזמנה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
