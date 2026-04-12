'use client'

import { useState } from 'react'
import type { ScheduleTemplate, SchedulePeriodEntry, Room } from '@/types/domain'
import type { SchoolType } from '@/lib/school-periods'
import ScheduleTemplateEditor from './ScheduleTemplateEditor'

interface RoomScheduleRow {
  room_id: string
  template_id: string | null
  custom_periods: SchedulePeriodEntry[] | null
}

interface Props {
  templates: ScheduleTemplate[]
  rooms: Room[]
  roomSchedules: RoomScheduleRow[]
}

type Tab = 'templates' | 'rooms'

export default function SchedulesManager({ templates: initialTemplates, rooms, roomSchedules: initialSchedules }: Props) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [roomSchedules, setRoomSchedules] = useState(initialSchedules)
  const [activeTab, setActiveTab] = useState<Tab>('templates')

  // Template editing state
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [editName, setEditName] = useState('')
  const [editSchoolType, setEditSchoolType] = useState<SchoolType>('יסודי')
  const [editPeriods, setEditPeriods] = useState<SchedulePeriodEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Room schedule saving state
  const [savingRoom, setSavingRoom] = useState<string | null>(null)

  function startEdit(template: ScheduleTemplate) {
    setEditingId(template.id)
    setEditName(template.name)
    setEditSchoolType(template.school_type as SchoolType)
    setEditPeriods(template.periods)
    setError('')
  }

  function startNew() {
    setEditingId('new')
    setEditName('')
    setEditSchoolType('יסודי')
    setEditPeriods([])
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  async function saveTemplate() {
    if (!editName.trim()) { setError('נדרש שם'); return }
    setSaving(true)
    setError('')
    try {
      if (editingId === 'new') {
        const res = await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, school_type: editSchoolType, periods: editPeriods }),
        })
        if (!res.ok) throw new Error(await res.text())
        const { template } = await res.json()
        setTemplates(prev => [...prev, template])
      } else {
        const res = await fetch(`/api/admin/templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName, periods: editPeriods }),
        })
        if (!res.ok) throw new Error(await res.text())
        const { template } = await res.json()
        setTemplates(prev => prev.map(t => t.id === editingId ? template : t))
      }
      setEditingId(null)
    } catch {
      setError('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('למחוק תבנית זו? חדרים שמשויכים אליה יישארו ללא מערכת שעות.')) return
    const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates(prev => prev.filter(t => t.id !== id))
      setRoomSchedules(prev => prev.map(s => s.template_id === id ? { ...s, template_id: null } : s))
      if (editingId === id) setEditingId(null)
    }
  }

  async function assignTemplate(roomId: string, templateId: string | '') {
    setSavingRoom(roomId)
    try {
      if (templateId === '') {
        await fetch(`/api/admin/schedules/${roomId}`, { method: 'DELETE' })
        setRoomSchedules(prev => prev.filter(s => s.room_id !== roomId))
      } else {
        const res = await fetch('/api/admin/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: roomId, template_id: templateId }),
        })
        if (!res.ok) throw new Error()
        setRoomSchedules(prev => {
          const existing = prev.find(s => s.room_id === roomId)
          if (existing) return prev.map(s => s.room_id === roomId ? { ...s, template_id: templateId, custom_periods: null } : s)
          return [...prev, { room_id: roomId, template_id: templateId, custom_periods: null }]
        })
      }
    } finally {
      setSavingRoom(null)
    }
  }

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button type="button" className={tabClass('templates')} onClick={() => setActiveTab('templates')}>תבניות מערכת שעות</button>
        <button type="button" className={tabClass('rooms')} onClick={() => setActiveTab('rooms')}>שיוך חדרים לתבנית</button>
      </div>

      {/* Templates tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">תבניות קיימות</h2>
            {editingId !== 'new' && (
              <button
                type="button"
                onClick={startNew}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                + תבנית חדשה
              </button>
            )}
          </div>

          {/* New template form */}
          {editingId === 'new' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
              <h3 className="font-medium text-gray-800 mb-4">תבנית חדשה</h3>
              <div className="flex gap-4 mb-4 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">שם תבנית</label>
                  <input
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="למשל: יסודי סיום 14:00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">סוג בית ספר</label>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    value={editSchoolType}
                    onChange={e => setEditSchoolType(e.target.value as SchoolType)}
                  >
                    <option value="יסודי">יסודי</option>
                    <option value="תיכון">תיכון</option>
                  </select>
                </div>
              </div>

              <ScheduleTemplateEditor
                schoolType={editSchoolType}
                initialPeriods={editPeriods}
                onChange={setEditPeriods}
              />

              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={saving}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'שומר...' : 'שמור'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}

          {/* Templates list */}
          <div className="space-y-3">
            {templates.length === 0 && <p className="text-gray-500 text-sm">אין תבניות</p>}
            {templates.map(t => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{t.name}</span>
                    <span className="mr-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{t.school_type}</span>
                    <span className="mr-1 text-xs text-gray-400">{t.periods.length} שעות תפוסות</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editingId === t.id ? cancelEdit() : startEdit(t)}
                      className="text-sm text-brand-600 hover:text-brand-800 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                    >
                      {editingId === t.id ? 'סגור' : 'ערוך'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      מחק
                    </button>
                  </div>
                </div>
                {editingId === t.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">שם תבנית</label>
                      <input
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <ScheduleTemplateEditor
                        schoolType={t.school_type as SchoolType}
                        initialPeriods={editPeriods}
                        onChange={setEditPeriods}
                      />
                    </div>
                    {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={saveTemplate}
                        disabled={saving}
                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        {saving ? 'שומר...' : 'שמור שינויים'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-900 text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rooms tab */}
      {activeTab === 'rooms' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            שייך תבנית מערכת שעות לכל חדר. חדר עם תבנית יסומן כתפוס בזמן שיעורים ולא ניתן יהיה להזמינו בשעות אלו.
          </p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">חדר</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">בניין</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">קומה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">תבנית מערכת</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map(room => {
                  const sched = roomSchedules.find(s => s.room_id === room.id)
                  const currentTemplateId = sched?.template_id ?? ''
                  const isSaving = savingRoom === room.id

                  return (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {room.room_number}{room.name ? ` — ${room.name}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{room.building}</td>
                      <td className="px-4 py-2.5 text-gray-600">{room.floor}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={currentTemplateId}
                          disabled={isSaving}
                          onChange={e => assignTemplate(room.id, e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm disabled:opacity-50"
                        >
                          <option value="">ללא מערכת שעות</option>
                          {templates
                            .filter(t => t.school_type === (room.building === 'תיכון' ? 'תיכון' : 'יסודי'))
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))
                          }
                        </select>
                        {isSaving && <span className="text-xs text-gray-400 mr-2">שומר...</span>}
                        {sched?.custom_periods && (
                          <span className="text-xs text-amber-600 mr-2">מותאם אישית</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
