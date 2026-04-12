'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Room, Building } from '@/types/domain'

const DEFAULT_EQUIPMENT_OPTIONS = [
  { value: 'piano', label: 'פסנתר' },
  { value: 'projector', label: 'מקרן' },
  { value: 'dance_floor', label: 'רצפת ריקוד' },
  { value: 'whiteboard', label: 'לוח' },
  { value: 'computers', label: 'מחשבים' },
  { value: 'sound_system', label: 'מערכת שמע' },
]

interface RoomManagerProps {
  rooms: Room[]
}

interface EquipmentPickerProps {
  selected: string[]
  onChange: (equipment: string[]) => void
}

function EquipmentPicker({ selected, onChange }: EquipmentPickerProps) {
  const [options, setOptions] = useState(DEFAULT_EQUIPMENT_OPTIONS)
  const [newItem, setNewItem] = useState('')

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((e) => e !== value) : [...selected, value]
    )
  }

  function addCustom() {
    const trimmed = newItem.trim()
    if (!trimmed) return
    const value = trimmed.toLowerCase().replace(/\s+/g, '_')
    if (!options.find((o) => o.value === value)) {
      setOptions((prev) => [...prev, { value, label: trimmed }])
    }
    if (!selected.includes(value)) {
      onChange([...selected, value])
    }
    setNewItem('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map((eq) => (
          <button
            key={eq.value}
            type="button"
            onClick={() => toggle(eq.value)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              selected.includes(eq.value)
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'border-gray-300 text-gray-700 hover:border-brand-400'
            }`}
          >
            {eq.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="הוסף ציוד חדש..."
          className="border border-dashed border-gray-400 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!newItem.trim()}
          className="text-sm text-brand-600 border border-brand-300 hover:bg-brand-50 disabled:opacity-40 px-3 py-1 rounded-lg transition-colors"
        >
          + הוסף
        </button>
      </div>
    </div>
  )
}

function RoomForm({ onSave }: { onSave: () => void }) {
  const [floor, setFloor] = useState(1)
  const [roomNumber, setRoomNumber] = useState('')
  const [name, setName] = useState('')
  const [building, setBuilding] = useState<Building>('יסודי')
  const [capacity, setCapacity] = useState(10)
  const [equipment, setEquipment] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor, room_number: roomNumber, name, building, capacity, equipment }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'שגיאה')
      setLoading(false)
      return
    }

    setFloor(1)
    setRoomNumber('')
    setName('')
    setBuilding('יסודי')
    setCapacity(10)
    setEquipment([])
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
      <h2 className="font-semibold text-gray-900">הוסף חדר חדש</h2>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">קומה</label>
          <input
            type="number"
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
            min={0}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            dir="ltr"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">מספר חדר</label>
          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            required
            placeholder="101"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            dir="ltr"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">קיבולת</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            min={1}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            dir="ltr"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">שם החדר</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="למשל: סטודיו, חדר אוריתמיה, ו1'..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">בניין</label>
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value as Building)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="יסודי">יסודי</option>
            <option value="תיכון">תיכון</option>
            <option value="אלוט">אלו&quot;ט</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ציוד</label>
        <EquipmentPicker selected={equipment} onChange={setEquipment} />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
      >
        {loading ? 'שומר...' : 'הוסף חדר'}
      </button>
    </form>
  )
}

function RoomEditor({ room, onSave }: { room: Room; onSave: () => void }) {
  const [name, setName] = useState(room.name ?? '')
  const [building, setBuilding] = useState<Building>(room.building ?? 'יסודי')
  const [equipment, setEquipment] = useState<string[]>(room.equipment ?? [])
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await fetch(`/api/admin/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, building, equipment }),
    })
    setLoading(false)
    onSave()
  }

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 mb-1">שם החדר:</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="למשל: סטודיו, חדר אוריתמיה..."
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">בניין:</p>
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value as Building)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="יסודי">יסודי</option>
            <option value="תיכון">תיכון</option>
            <option value="אלוט">אלו&quot;ט</option>
          </select>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">ציוד:</p>
        <EquipmentPicker selected={equipment} onChange={setEquipment} />
      </div>
      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        {loading ? 'שומר...' : 'שמור'}
      </button>
    </div>
  )
}

export default function RoomManager({ rooms }: RoomManagerProps) {
  const router = useRouter()
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete(room: Room) {
    if (!confirm(`למחוק את חדר ${room.room_number}${room.name ? ` (${room.name})` : ''}?\nהזמנות עתידיות פעילות יבוטלו ובעליהן יקבלו הודעה במייל.`)) return
    setDeletingId(room.id)
    setDeleteError('')
    const res = await fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setDeleteError(data.error ?? 'שגיאה במחיקה')
    }
    setDeletingId(null)
  }

  async function handleToggleActive(room: Room) {
    setTogglingId(room.id)
    await fetch(`/api/admin/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !room.is_active }),
    })
    setTogglingId(null)
    router.refresh()
  }

  return (
    <div>
      <RoomForm onSave={() => router.refresh()} />
      {deleteError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-700">בניין</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">קומה</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">חדר</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">שם</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">קיבולת</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">ציוד</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms.map((room) => (
              <React.Fragment key={room.id}>
                <tr className={`hover:bg-gray-50 ${!room.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-600">{room.building}</td>
                  <td className="px-4 py-3 text-gray-700">{room.floor}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{room.room_number}</td>
                  <td className="px-4 py-3 text-gray-600">{room.name}</td>
                  <td className="px-4 py-3 text-gray-600">{room.capacity}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      {(room.equipment ?? []).map((eq) => (
                        <span key={eq} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                          {DEFAULT_EQUIPMENT_OPTIONS.find((o) => o.value === eq)?.label ?? eq}
                        </span>
                      ))}
                      <button
                        onClick={() => setEditingEquipmentId(editingEquipmentId === room.id ? null : room.id)}
                        className="text-xs text-brand-600 hover:text-brand-800 underline mr-1"
                      >
                        {editingEquipmentId === room.id ? 'סגור' : 'ערוך'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {room.is_active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => handleToggleActive(room)} disabled={togglingId === room.id}
                        className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-500 px-2 py-1 rounded-md disabled:opacity-50 transition-colors">
                        {room.is_active ? 'השבת' : 'הפעל'}
                      </button>
                      <button onClick={() => handleDelete(room)} disabled={deletingId === room.id}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2 py-1 rounded-md disabled:opacity-50 transition-colors">
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
                {editingEquipmentId === room.id && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <RoomEditor room={room} onSave={() => { setEditingEquipmentId(null); router.refresh() }} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {rooms.map((room) => (
          <React.Fragment key={room.id}>
            <div className={`bg-white border border-gray-200 rounded-xl p-4 ${!room.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900">חדר {room.room_number} — קומה {room.floor}</p>
                  <p className="text-sm text-gray-500">קיבולת: {room.capacity}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {room.is_active ? 'פעיל' : 'לא פעיל'}
                </span>
              </div>
              {(room.equipment ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {(room.equipment ?? []).map((eq) => (
                    <span key={eq} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {DEFAULT_EQUIPMENT_OPTIONS.find((o) => o.value === eq)?.label ?? eq}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingEquipmentId(editingEquipmentId === room.id ? null : room.id)}
                  className="flex-1 text-sm text-brand-600 border border-brand-300 hover:bg-brand-50 py-1.5 rounded-lg transition-colors"
                >
                  {editingEquipmentId === room.id ? 'סגור' : 'ערוך'}
                </button>
                <button onClick={() => handleToggleActive(room)} disabled={togglingId === room.id}
                  className="flex-1 text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                  {room.is_active ? 'השבת' : 'הפעל'}
                </button>
                <button onClick={() => handleDelete(room)} disabled={deletingId === room.id}
                  className="text-sm text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
                  מחק
                </button>
              </div>
            </div>
            {editingEquipmentId === room.id && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <RoomEditor room={room} onSave={() => { setEditingEquipmentId(null); router.refresh() }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
