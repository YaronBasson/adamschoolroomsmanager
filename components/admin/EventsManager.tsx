'use client'

import { useState, useMemo } from 'react'
import type { SchoolEvent, EventStatus } from '@/services/events.service'
import { getEventStatus } from '@/services/events.service'
import type { Profile } from '@/types/domain'

const STATUS_COLOR: Record<EventStatus, string> = {
  green:  'bg-green-500',
  orange: 'bg-orange-400',
  gray:   'bg-gray-300',
}
const STATUS_LABEL: Record<EventStatus, string> = {
  green:  'חדר מוזמן',
  orange: 'ממתין — קרוב!',
  gray:   'ממתין',
}

const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const EMPTY: Partial<SchoolEvent> = {
  title: '',
  event_date: null,
  school_type: null,
  description: null,
  responsible_user_id: null,
  classes: [],
  booking_ids: [],
}

interface Props {
  events: SchoolEvent[]
  users: Pick<Profile, 'id' | 'full_name' | 'email'>[]
}

export default function EventsManager({ events: initial, users }: Props) {
  const today = new Date()
  const [events, setEvents] = useState(initial)
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [editing, setEditing] = useState<Partial<SchoolEvent> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [classInput, setClassInput] = useState('')

  // Filter events for selected month (or no date)
  const filtered = useMemo(() => {
    return events.filter(ev => {
      if (!ev.event_date) return true // undated events always show
      const d = new Date(ev.event_date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }, [events, month, year])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function openNew() {
    setEditing({ ...EMPTY })
    setIsNew(true)
    setError('')
    setClassInput('')
  }

  function openEdit(ev: SchoolEvent) {
    setEditing({ ...ev })
    setIsNew(false)
    setError('')
    setClassInput('')
  }

  function closeModal() { setEditing(null); setError('') }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing?.title?.trim()) { setError('נדרש כותרת'); return }
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        const res = await fetch('/api/admin/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editing),
        })
        if (!res.ok) throw new Error('שגיאה ביצירת ארוע')
        const { event } = await res.json()
        setEvents(prev => [event, ...prev])
      } else {
        const res = await fetch(`/api/admin/events/${editing!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editing),
        })
        if (!res.ok) throw new Error('שגיאה בעדכון ארוע')
        const { event } = await res.json()
        setEvents(prev => prev.map(ev => ev.id === event.id ? event : ev))
      }
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`למחוק את הארוע "${title}"?`)) return
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    if (res.ok) setEvents(prev => prev.filter(ev => ev.id !== id))
  }

  function addClass() {
    const cls = classInput.trim()
    if (!cls || editing?.classes?.includes(cls)) return
    setEditing(prev => ({ ...prev, classes: [...(prev?.classes ?? []), cls] }))
    setClassInput('')
  }

  function removeClass(cls: string) {
    setEditing(prev => ({ ...prev, classes: prev?.classes?.filter(c => c !== cls) ?? [] }))
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">‹</button>
          <span className="font-semibold text-gray-900 min-w-32 text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">›</button>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + ארוע חדש
        </button>
      </div>

      {/* Status legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        {(Object.entries(STATUS_COLOR) as [EventStatus, string][]).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      {/* Events list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">אין ארועים לחודש זה</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ev => {
            const status = getEventStatus(ev)
            return (
              <div
                key={ev.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 hover:border-gray-300 transition-colors"
              >
                <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLOR[status]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-gray-900">{ev.title}</span>
                      {ev.school_type && (
                        <span className="mr-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{ev.school_type}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {ev.event_date ? new Date(ev.event_date).toLocaleDateString('he-IL') : 'תאריך לא נקבע'}
                    </span>
                  </div>
                  {ev.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{ev.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    {(ev.responsible_user as { full_name?: string } | null)?.full_name && (
                      <span>אחראי: {(ev.responsible_user as { full_name: string }).full_name}</span>
                    )}
                    {ev.classes.length > 0 && (
                      <span>כיתות: {ev.classes.join(', ')}</span>
                    )}
                    {ev.booking_ids.length > 0 && (
                      <span className="text-green-600">{ev.booking_ids.length} חדרים מוזמנים</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(ev)}
                    className="text-xs text-brand-600 hover:text-brand-800 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                  >
                    ערוך
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ev.id, ev.title)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    מחק
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{isNew ? 'ארוע חדש' : 'עריכת ארוע'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כותרת *</label>
                <input
                  type="text"
                  value={editing.title ?? ''}
                  onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
                  <input
                    type="date"
                    value={editing.event_date ?? ''}
                    onChange={e => setEditing(p => ({ ...p, event_date: e.target.value || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סוג בית ספר</label>
                  <select
                    value={editing.school_type ?? ''}
                    onChange={e => setEditing(p => ({ ...p, school_type: e.target.value as SchoolEvent['school_type'] || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">לא מוגדר</option>
                    <option value="יסודי">יסודי</option>
                    <option value="תיכון">תיכון</option>
                    <option value="שניהם">שניהם</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
                <textarea
                  value={editing.description ?? ''}
                  onChange={e => setEditing(p => ({ ...p, description: e.target.value || null }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אחראי</label>
                <select
                  value={editing.responsible_user_id ?? ''}
                  onChange={e => setEditing(p => ({ ...p, responsible_user_id: e.target.value || null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">ללא</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כיתות</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={classInput}
                    onChange={e => setClassInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addClass() } }}
                    placeholder="למשל: ז'1"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button type="button" onClick={addClass} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">הוסף</button>
                </div>
                {(editing.classes ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(editing.classes ?? []).map(cls => (
                      <span key={cls} className="bg-brand-50 text-brand-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {cls}
                        <button type="button" onClick={() => removeClass(cls)} className="hover:text-brand-900">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  {saving ? 'שומר...' : isNew ? 'צור ארוע' : 'שמור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
