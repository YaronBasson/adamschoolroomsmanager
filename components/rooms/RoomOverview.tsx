'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Room, Booking, RoomSchedule, ScheduleTemplate, Building } from '@/types/domain'
import { PERIODS, type SchoolType } from '@/lib/school-periods'
import BookingForm from './BookingForm'

type RoomScheduleWithTemplate = RoomSchedule & { template: ScheduleTemplate | null }

interface RoomOverviewProps {
  rooms: Room[]
  bookings: Booking[]
  roomSchedules: RoomScheduleWithTemplate[]
  templates: ScheduleTemplate[]
  date: string
  currentUserId: string
  isAdmin: boolean
}

type CellKind = 'free' | 'booked' | 'class' | 'none'
interface CellState {
  kind: CellKind
  booking?: Booking
  classLabel?: string
}

const ALL_PERIODS = Array.from({ length: 10 }, (_, i) => i + 1)

function schoolTypeForBuilding(b: Building): SchoolType {
  return b === 'תיכון' ? 'תיכון' : 'יסודי'
}

export default function RoomOverview({
  rooms,
  bookings,
  roomSchedules,
  templates,
  date,
}: RoomOverviewProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(date)
  const [buildingFilter, setBuildingFilter] = useState<Building | 'all'>('all')
  const [bookingTarget, setBookingTarget] = useState<{
    room: Room
    startPeriod: number
    endPeriod: number
    schoolType: SchoolType
  } | null>(null)

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate)
    router.push(`/rooms/overview?date=${newDate}`)
  }

  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    handleDateChange(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }))
  }

  const dayOfWeek = useMemo(
    () => new Date(selectedDate + 'T12:00:00').getDay(),
    [selectedDate]
  )

  const isToday = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
    return selectedDate === today
  }, [selectedDate])

  const currentPeriodNum = useMemo(() => {
    if (!isToday) return null
    const nowHHMM = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem',
    })
    for (const p of PERIODS.תיכון) {
      if (p.start <= nowHHMM && p.end > nowHHMM) return p.number
    }
    return null
  }, [isToday])

  // roomId -> Set<period> occupied by class for the current dayOfWeek
  const scheduleByRoom = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const sched of roomSchedules) {
      let periods = sched.custom_periods
      if (!periods && sched.template_id) {
        periods = templates.find((t) => t.id === sched.template_id)?.periods ?? []
      }
      if (!periods) continue
      const occupied = new Set<number>()
      for (const entry of periods) {
        if (entry.day === dayOfWeek) occupied.add(entry.period)
      }
      if (occupied.size > 0) map.set(sched.room_id, occupied)
    }
    return map
  }, [roomSchedules, templates, dayOfWeek])

  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of bookings) {
      if (!map.has(b.room_id)) map.set(b.room_id, [])
      map.get(b.room_id)!.push(b)
    }
    return map
  }, [bookings])

  // Pre-compute the entire matrix
  const matrix = useMemo(() => {
    return rooms.map((room) => {
      const schoolType = schoolTypeForBuilding(room.building)
      const periodDefs = PERIODS[schoolType]
      const maxP = periodDefs[periodDefs.length - 1].number
      const cells: CellState[] = ALL_PERIODS.map((p) => {
        if (p > maxP) return { kind: 'none' }
        const periodDef = periodDefs.find((pd) => pd.number === p)!
        const roomBookings = bookingsByRoom.get(room.id) ?? []
        for (const b of roomBookings) {
          const sH = new Date(b.start_time).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jerusalem',
          })
          const eH = new Date(b.end_time).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jerusalem',
          })
          if (sH < periodDef.end && eH > periodDef.start) {
            return { kind: 'booked', booking: b }
          }
        }
        if (dayOfWeek !== 6 && scheduleByRoom.get(room.id)?.has(p)) {
          const sched = roomSchedules.find((s) => s.room_id === room.id)
          return { kind: 'class', classLabel: sched?.template?.name ?? undefined }
        }
        return { kind: 'free' }
      })
      return { room, cells }
    })
  }, [rooms, bookingsByRoom, scheduleByRoom, dayOfWeek, roomSchedules])

  const filtered = useMemo(
    () =>
      matrix.filter(
        ({ room }) => buildingFilter === 'all' || room.building === buildingFilter
      ),
    [matrix, buildingFilter]
  )

  const grouped = useMemo(() => {
    const order: Building[] = ['יסודי', 'תיכון', 'אלוט']
    return order
      .map((b) => ({
        building: b,
        rows: filtered
          .filter((r) => r.room.building === b)
          .sort(
            (a, z) =>
              a.room.floor - z.room.floor ||
              a.room.room_number.localeCompare(z.room.room_number)
          ),
      }))
      .filter((g) => g.rows.length > 0)
  }, [filtered])

  const stats = useMemo(() => {
    let free = 0
    let occupied = 0
    for (const { cells } of filtered) {
      for (const c of cells) {
        if (c.kind === 'free') free++
        else if (c.kind === 'booked' || c.kind === 'class') occupied++
      }
    }
    return { free, occupied }
  }, [filtered])

  function handleCellClick(room: Room, periodNum: number, state: CellState) {
    if (state.kind !== 'free') return
    const schoolType = schoolTypeForBuilding(room.building)
    const maxP = PERIODS[schoolType][PERIODS[schoolType].length - 1].number
    const endPeriod = periodNum >= maxP ? maxP : periodNum + 1
    setBookingTarget({ room, startPeriod: periodNum, endPeriod, schoolType })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">תצוגה כללית</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
            aria-label="יום קודם"
          >
            ▶
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            dir="ltr"
          />
          <button
            onClick={() => shiftDate(1)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
            aria-label="יום הבא"
          >
            ◀
          </button>
        </div>
      </div>

      {/* Filters + legend */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              ['all', 'הכל'],
              ['יסודי', 'יסודי'],
              ['תיכון', 'תיכון'],
              ['אלוט', 'אלו"ט'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setBuildingFilter(val)}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                buildingFilter === val
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-green-400" />
            פנוי
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-red-400" />
            תפוס
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-blue-300" />
            שיעור
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-gray-200 border border-gray-300" />
            אין שיעור
          </span>
        </div>
      </div>

      {/* Matrix */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto bg-white"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th
                className="text-right font-medium text-gray-700 px-2 py-1.5 border-b border-gray-200"
                style={{ minWidth: 200 }}
              >
                חדר
              </th>
              {ALL_PERIODS.map((p) => (
                <th
                  key={p}
                  className={`text-center font-medium px-1 py-1.5 border-b border-gray-200 ${
                    currentPeriodNum === p
                      ? 'bg-brand-100 text-brand-700'
                      : 'text-gray-600'
                  }`}
                  style={{ width: 38 }}
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ building, rows }) => (
              <Fragment key={building}>
                <tr>
                  <td
                    colSpan={11}
                    className="bg-gray-100 text-gray-700 font-semibold text-xs px-3 py-1 border-b border-gray-200"
                  >
                    {building === 'אלוט' ? 'אלו"ט' : building}
                  </td>
                </tr>
                {rows.map(({ room, cells }, idx) => {
                  const prevFloor = idx > 0 ? rows[idx - 1].room.floor : null
                  const floorChanged = prevFloor !== null && prevFloor !== room.floor
                  return (
                  <tr
                    key={room.id}
                    className={`hover:bg-gray-50 ${floorChanged ? 'border-t-2 border-t-gray-300' : ''}`}
                  >
                    <td
                      className={`text-right text-gray-700 px-2 border-b border-gray-100 truncate ${floorChanged ? 'border-t-2 border-t-gray-300' : ''}`}
                      style={{ maxWidth: 200, height: 26 }}
                    >
                      <span className="font-medium">{room.room_number}</span>
                      {room.name && (
                        <span className="text-gray-500"> · {room.name}</span>
                      )}
                    </td>
                    {cells.map((state, idx) => {
                      const periodNum = idx + 1
                      const isNow = currentPeriodNum === periodNum
                      let bg = 'bg-gray-200'
                      let cursor = 'cursor-default'
                      let tooltip = 'אין שיעור'
                      if (state.kind === 'free') {
                        bg = 'bg-green-400 hover:bg-green-500'
                        cursor = 'cursor-pointer'
                        tooltip = 'פנוי — לחץ להזמנה'
                      } else if (state.kind === 'booked') {
                        bg = 'bg-red-400'
                        const b = state.booking
                        const who = b?.profile?.full_name ?? ''
                        const why = b?.reason?.name ?? b?.reason_text ?? ''
                        tooltip = [who, why].filter(Boolean).join(' — ') || 'תפוס'
                      } else if (state.kind === 'class') {
                        bg = 'bg-blue-300'
                        tooltip = state.classLabel
                          ? `שיעור: ${state.classLabel}`
                          : 'שיעור'
                      }
                      return (
                        <td
                          key={periodNum}
                          className={`p-0.5 border-b border-gray-100 ${
                            isNow ? 'bg-brand-50/50' : ''
                          }`}
                        >
                          <button
                            type="button"
                            title={tooltip}
                            onClick={() => handleCellClick(room, periodNum, state)}
                            disabled={state.kind !== 'free'}
                            className={`w-full h-full block rounded ${bg} ${cursor}`}
                            style={{ minHeight: 18 }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats footer */}
      <div className="mt-2 text-xs text-gray-500">
        {stats.free} משבצות פנויות · {stats.occupied} תפוסות
      </div>

      {/* Booking modal */}
      {bookingTarget && (
        <BookingForm
          room={bookingTarget.room}
          defaultStartDate={selectedDate}
          defaultSchoolType={bookingTarget.schoolType}
          defaultStartPeriod={bookingTarget.startPeriod}
          defaultEndPeriod={bookingTarget.endPeriod}
          onClose={() => setBookingTarget(null)}
          onSuccess={() => {
            setBookingTarget(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
