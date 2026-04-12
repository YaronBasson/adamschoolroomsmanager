'use client'

import { useState, useEffect } from 'react'
import type { Room, BookingReason } from '@/types/domain'
import { PERIODS, type SchoolType, type Period } from '@/lib/school-periods'

interface BookingFormProps {
  room: Room
  defaultStartDate: string
  onClose: () => void
  onSuccess: () => void
}

const CUSTOM = '__custom__'

export default function BookingForm({ room, defaultStartDate, onClose, onSuccess }: BookingFormProps) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
  const [reasons, setReasons] = useState<BookingReason[]>([])
  const [selectedReasonId, setSelectedReasonId] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [startDate, setStartDate] = useState(defaultStartDate < today ? today : defaultStartDate)
  const [endDate, setEndDate] = useState(defaultStartDate < today ? today : defaultStartDate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState<number>(new Date(defaultStartDate).getDay())

  // Period selection
  const [schoolType, setSchoolType] = useState<SchoolType>('תיכון')
  const [startPeriodNum, setStartPeriodNum] = useState<number | typeof CUSTOM>(1)
  const [endPeriodNum, setEndPeriodNum] = useState<number | typeof CUSTOM>(2)
  // Custom time fallback
  const [customStartTime, setCustomStartTime] = useState('08:00')
  const [customEndTime, setCustomEndTime] = useState('09:00')

  useEffect(() => {
    fetch('/api/booking-reasons').then((r) => r.json()).then(setReasons)
  }, [])

  const periods = PERIODS[schoolType]

  function getStartPeriod(): Period | null {
    if (startPeriodNum === CUSTOM) return null
    return periods.find((p) => p.number === startPeriodNum) ?? null
  }

  function getEndPeriod(): Period | null {
    if (endPeriodNum === CUSTOM) return null
    return periods.find((p) => p.number === endPeriodNum) ?? null
  }

  function resolvedStartTime(): string {
    return startPeriodNum === CUSTOM ? customStartTime : (getStartPeriod()?.start ?? '08:00')
  }

  function resolvedEndTime(): string {
    return endPeriodNum === CUSTOM ? customEndTime : (getEndPeriod()?.end ?? '09:00')
  }

  // When school type changes, reset period selection to 1/2 if current numbers are out of range
  function handleSchoolTypeChange(type: SchoolType) {
    setSchoolType(type)
    const newPeriods = PERIODS[type]
    const maxNum = newPeriods[newPeriods.length - 1].number
    if (typeof startPeriodNum === 'number' && startPeriodNum > maxNum) setStartPeriodNum(1)
    if (typeof endPeriodNum === 'number' && endPeriodNum > maxNum) setEndPeriodNum(2)
  }

  // Keep end date >= start date
  function handleStartDateChange(val: string) {
    setStartDate(val)
    if (val > endDate) setEndDate(val)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const startTime = resolvedStartTime()
    const endTime = resolvedEndTime()

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

    if (isRecurring) {
      const body = {
        room_id: room.id,
        reason_id: selectedReasonId && selectedReasonId !== '__custom_reason__' ? selectedReasonId : undefined,
        reason_text: selectedReasonId === '__custom_reason__' ? customReason : undefined,
        day_of_week: recurringDay,
        start_period: typeof startPeriodNum === 'number' ? startPeriodNum : 1,
        end_period: typeof endPeriodNum === 'number' ? endPeriodNum : 2,
        school_type: schoolType,
        start_date: startDate,
      }
      const res = await fetch('/api/recurring-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'שגיאה ביצירת הבקשה')
        setLoading(false)
        return
      }
      onSuccess()
      return
    }

    const body = {
      room_id: room.id,
      reason_id: selectedReasonId && selectedReasonId !== '__custom_reason__' ? selectedReasonId : undefined,
      reason_text: selectedReasonId === '__custom_reason__' ? customReason : undefined,
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
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            הזמנת חדר {room.room_number}{room.name ? ` — ${room.name}` : ''}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <p className="text-sm text-gray-500 mb-5">קומה {room.floor}</p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* School type toggle */}
          <div className="flex gap-2">
            {(['תיכון', 'יסודי'] as SchoolType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSchoolTypeChange(type)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  schoolType === type
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => setIsRecurring(r => !r)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRecurring ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700">הזמנה חוזרת (כל שבוע)</span>
          </div>

          {isRecurring && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3">
              <p className="text-xs text-brand-700 mb-2 font-medium">הבקשה תישלח לאישור מנהל — לאחר אישור יווצרו הזמנות שבועיות עד סוף שנת הלימודים.</p>
              <label className="block text-xs font-medium text-gray-600 mb-1">יום בשבוע</label>
              <select
                value={recurringDay}
                onChange={e => setRecurringDay(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {['ראשון','שני','שלישי','רביעי','חמישי','שישי'].map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
          )}

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
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-600 mb-1">שעת התחלה</label>
                <select
                  value={startPeriodNum}
                  onChange={(e) => {
                    const val = e.target.value
                    setStartPeriodNum(val === CUSTOM ? CUSTOM : Number(val))
                  }}
                  className={inputClass}
                >
                  {periods.map((p) => (
                    <option key={p.number} value={p.number}>
                      {p.label} ({p.start})
                    </option>
                  ))}
                  <option value={CUSTOM}>שעה מותאמת</option>
                </select>
                {startPeriodNum === CUSTOM && (
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    required
                    className={`${inputClass} mt-1`}
                    dir="ltr"
                  />
                )}
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
                  className={inputClass}
                  dir="ltr"
                />
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-600 mb-1">שעת סיום</label>
                <select
                  value={endPeriodNum}
                  onChange={(e) => {
                    const val = e.target.value
                    setEndPeriodNum(val === CUSTOM ? CUSTOM : Number(val))
                  }}
                  className={inputClass}
                >
                  {periods.map((p) => (
                    <option key={p.number} value={p.number}>
                      {p.label} ({p.end})
                    </option>
                  ))}
                  <option value={CUSTOM}>שעה מותאמת</option>
                </select>
                {endPeriodNum === CUSTOM && (
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    required
                    className={`${inputClass} mt-1`}
                    dir="ltr"
                  />
                )}
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
              className={inputClass}
            >
              <option value="">בחר סיבה...</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
              <option value="__custom_reason__">אחר (הזן סיבה חדשה)</option>
            </select>
          </div>

          {selectedReasonId === '__custom_reason__' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיבה מותאמת אישית</label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                required
                placeholder="פרט את הסיבה..."
                className={inputClass}
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
              {loading ? 'שולח...' : isRecurring ? 'שלח לאישור' : 'אשר הזמנה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
