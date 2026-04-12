'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Room, Booking, Building } from '@/types/domain'
import RoomCard from './RoomCard'
import BookingForm from './BookingForm'
import SwitchRequestModal from './SwitchRequestModal'

interface RoomGridProps {
  rooms: Room[]
  bookings: Booking[]
  date: string
  currentUserId: string
  isAdmin: boolean
}

const EQUIPMENT_LABELS: Record<string, string> = {
  piano: 'פסנתר',
  projector: 'מקרן',
  dance_floor: 'רצפת ריקוד',
  whiteboard: 'לוח',
  computers: 'מחשבים',
  sound_system: 'מערכת שמע',
}

export default function RoomGrid({ rooms, bookings, date, currentUserId, isAdmin }: RoomGridProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(date)
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null)
  const [switchTarget, setSwitchTarget] = useState<Booking | null>(null)

  // Filters
  const [minCapacity, setMinCapacity] = useState('')
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([])
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'free' | 'occupied'>('all')
  const [buildingFilter, setBuildingFilter] = useState<Building | 'all'>('all')
  const [filtersOpen, setFiltersOpen] = useState(true)

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate)
    router.push(`/rooms?date=${newDate}`)
  }

  function getRoomBookings(roomId: string): Booking[] {
    return bookings.filter((b) => b.room_id === roomId)
  }

  function isRoomOccupiedNow(roomId: string): boolean {
    const now = new Date()
    return getRoomBookings(roomId).some(
      (b) => b.status === 'active' && new Date(b.start_time) <= now && new Date(b.end_time) >= now
    )
  }

  function toggleEquipmentFilter(value: string) {
    setRequiredEquipment((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]
    )
  }

  // Derive all equipment present across all rooms
  const allEquipment = Array.from(new Set(rooms.flatMap((r) => r.equipment ?? [])))

  // Apply filters
  const filteredRooms = rooms.filter((room) => {
    if (buildingFilter !== 'all' && room.building !== buildingFilter) return false
    if (minCapacity && room.capacity < Number(minCapacity)) return false
    if (requiredEquipment.length > 0) {
      const roomEq = room.equipment ?? []
      if (!requiredEquipment.every((eq) => roomEq.includes(eq))) return false
    }
    if (availabilityFilter === 'free' && isRoomOccupiedNow(room.id)) return false
    if (availabilityFilter === 'occupied' && !isRoomOccupiedNow(room.id)) return false
    return true
  })

  const activeFilterCount = [
    buildingFilter !== 'all' ? 1 : 0,
    minCapacity ? 1 : 0,
    requiredEquipment.length,
    availabilityFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  function clearFilters() {
    setBuildingFilter('all')
    setMinCapacity('')
    setRequiredEquipment([])
    setAvailabilityFilter('all')
  }

  return (
    <div>
      {/* Top bar: date + filter toggle */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">תאריך:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            dir="ltr"
          />
        </div>

        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? 'bg-brand-600 border-brand-600 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          סינון
          {activeFilterCount > 0 && (
            <span className="bg-white text-brand-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 underline">
            נקה סינון
          </button>
        )}
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Building */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">בניין</label>
              <div className="flex gap-2 flex-wrap">
                {([['all', 'הכל'], ['יסודי', 'יסודי'], ['תיכון', 'תיכון'], ['אלוט', 'אלו"ט']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBuildingFilter(val)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      buildingFilter === val
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">קיבולת מינימלית</label>
              <input
                type="number"
                min={1}
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                placeholder="ללא הגבלה"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">זמינות עכשיו</label>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'הכל' },
                  { value: 'free', label: 'פנויים' },
                  { value: 'occupied', label: 'תפוסים' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAvailabilityFilter(opt.value as typeof availabilityFilter)}
                    className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                      availabilityFilter === opt.value
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-brand-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Equipment */}
          {allEquipment.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ציוד נדרש</label>
              <div className="flex flex-wrap gap-2">
                {allEquipment.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipmentFilter(eq)}
                    className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                      requiredEquipment.includes(eq)
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-brand-400'
                    }`}
                  >
                    {EQUIPMENT_LABELS[eq] ?? eq}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results summary */}
      {activeFilterCount > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          מציג {filteredRooms.length} מתוך {rooms.length} חדרים
        </p>
      )}

      {/* Floor groups */}
      {Array.from(new Set(filteredRooms.map((r) => r.floor))).sort().map((floor) => (
        <div key={floor} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">קומה {floor}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms
              .filter((r) => r.floor === floor)
              .map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  bookings={getRoomBookings(room.id)}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onBook={() => setBookingRoom(room)}
                  onSwitchRequest={(booking) => setSwitchTarget(booking)}
                />
              ))}
          </div>
        </div>
      ))}

      {filteredRooms.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">לא נמצאו חדרים התואמים את הסינון</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-brand-600 hover:underline text-sm">
              נקה סינון
            </button>
          )}
        </div>
      )}

      {/* Booking modal */}
      {bookingRoom && (
        <BookingForm
          room={bookingRoom}
          defaultStartDate={selectedDate}
          onClose={() => setBookingRoom(null)}
          onSuccess={() => {
            setBookingRoom(null)
            router.refresh()
          }}
        />
      )}

      {/* Switch request modal */}
      {switchTarget && (
        <SwitchRequestModal
          targetBooking={switchTarget}
          onClose={() => setSwitchTarget(null)}
          onSuccess={() => {
            setSwitchTarget(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
