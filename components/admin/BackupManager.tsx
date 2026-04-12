'use client'

import { useState } from 'react'
import type { BackupRecord } from '@/services/backup.service'

export default function BackupManager({ backups: initial }: { backups: BackupRecord[] }) {
  const [backups, setBackups] = useState(initial)
  const [label, setLabel] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() }),
      })
      if (!res.ok) throw new Error('שגיאה ביצירת גיבוי')
      const { backup } = await res.json()
      setBackups(prev => [backup, ...prev])
      setLabel('')
      setShowCreate(false)
      setSuccess('גיבוי נוצר בהצלחה')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setCreating(false)
    }
  }

  async function handleRestore(id: string, backupLabel: string) {
    if (!confirm(`האם לשחזר את הגיבוי "${backupLabel}"?\n\nפעולה זו תמחק את כל הנתונים הנוכחיים ותחליף אותם בנתוני הגיבוי. לא ניתן לבטל פעולה זו.`)) return
    setRestoring(id)
    setError('')
    try {
      const res = await fetch(`/api/admin/backup/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('שגיאה בשחזור')
      setSuccess('שחזור הושלם בהצלחה — הדף יתרענן בעוד שנייה')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשחזור')
    } finally {
      setRestoring(null)
    }
  }

  async function handleDelete(id: string, backupLabel: string) {
    if (!confirm(`למחוק את הגיבוי "${backupLabel}"?`)) return
    const res = await fetch(`/api/admin/backup/${id}`, { method: 'DELETE' })
    if (res.ok) setBackups(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Create backup */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">יצירת גיבוי</h2>
          {!showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + גיבוי חדש
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          גיבוי שומר תמונת מצב מלאה של כל הנתונים: חדרים, הזמנות, משתמשים, מערכות שעות, והגדרות.
        </p>

        {showCreate && (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="תווית לגיבוי (למשל: לפני עדכון)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !label.trim()}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {creating ? 'שומר...' : 'שמור'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setLabel('') }}
              className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ביטול
            </button>
          </form>
        )}
      </div>

      {/* Status messages */}
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

      {/* Backups list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">גיבויים קיימים ({backups.length})</h2>
        </div>

        {backups.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">אין גיבויים עדיין</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-right">
                <th className="px-4 py-2.5 font-medium text-gray-600">תווית</th>
                <th className="px-4 py-2.5 font-medium text-gray-600">תאריך</th>
                <th className="px-4 py-2.5 font-medium text-gray-600">נוצר על ידי</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {backups.map(backup => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{backup.label}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums" dir="ltr">
                    {new Date(backup.created_at).toLocaleString('he-IL')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(backup.creator as { full_name?: string } | null)?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => handleRestore(backup.id, backup.label)}
                        disabled={restoring === backup.id}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1 rounded hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        {restoring === backup.id ? 'משחזר...' : 'שחזר'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(backup.id, backup.label)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        שחזור גיבוי מחליף את כל הנתונים הנוכחיים. חשבונות משתמשים (כניסה ל-Supabase Auth) אינם משוחזרים.
      </p>
    </div>
  )
}
