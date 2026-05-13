'use client'

import { Fragment, useEffect, useState } from 'react'
import type { ActivityLog } from '@/services/activity-log.service'

interface UserOption {
  id: string
  full_name: string
  email: string
}

interface Props {
  initialLogs: ActivityLog[]
  initialTotal: number
  pageSize: number
  knownActions: string[]
  users: UserOption[]
}

// Hebrew labels for known action codes. Falls back to the raw code if not listed.
const ACTION_LABELS: Record<string, string> = {
  'booking.created': 'הזמנה נוצרה',
  'booking.canceled': 'הזמנה בוטלה',
  'booking.batch_created': 'הזמנות מרובות נוצרו',
  'admin.booking.canceled': 'הזמנה בוטלה על ידי מנהל',
  'switch.requested': 'בקשת החלפה נשלחה',
  'switch.approved': 'החלפה אושרה',
  'switch.canceled': 'בקשת החלפה בוטלה',
  'recurring.requested': 'בקשת הזמנה קבועה',
  'admin.recurring.approved': 'בקשה קבועה אושרה',
  'admin.recurring.rejected': 'בקשה קבועה נדחתה',
  'admin.user.approved': 'משתמש אושר',
  'admin.user.role_changed': 'שינוי תפקיד משתמש',
  'admin.user.deleted': 'מחיקת משתמש',
  'admin.room.created': 'חדר נוצר',
  'admin.room.updated': 'חדר עודכן',
  'admin.room.deleted': 'חדר נמחק',
  'admin.reason.created': 'סיבה נוצרה',
  'admin.reason.updated': 'סיבה עודכנה',
  'admin.template.created': 'תבנית מערכת נוצרה',
  'admin.template.updated': 'תבנית מערכת עודכנה',
  'admin.template.deleted': 'תבנית מערכת נמחקה',
  'admin.schedule.set': 'תבנית שוייכה לחדר',
  'admin.schedule.cleared': 'מערכת הוסרה מחדר',
  'admin.schedule.customized': 'מערכת מותאמת לחדר',
  'admin.event.created': 'אירוע נוצר',
  'admin.event.updated': 'אירוע עודכן',
  'admin.event.deleted': 'אירוע נמחק',
  'admin.settings.updated': 'הגדרות עודכנו',
  'admin.backup.created': 'גיבוי נוצר',
  'admin.backup.restored': 'גיבוי שוחזר',
  'admin.backup.deleted': 'גיבוי נמחק',
}

export default function ActivityLogViewer({
  initialLogs,
  initialTotal,
  pageSize,
  knownActions,
  users,
}: Props) {
  const [logs, setLogs] = useState(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [actorId, setActorId] = useState('')
  const [action, setAction] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clearDays, setClearDays] = useState('90')
  const [clearing, setClearing] = useState(false)
  const [success, setSuccess] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))
        if (actorId) params.set('actorId', actorId)
        if (action) params.set('action', action)
        if (fromDate) params.set('fromDate', fromDate)
        if (toDate) params.set('toDate', toDate)
        const res = await fetch(`/api/admin/activity?${params.toString()}`)
        if (!res.ok) throw new Error('שגיאה בטעינה')
        const json = await res.json()
        if (cancelled) return
        setLogs(json.logs)
        setTotal(json.total)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'שגיאה')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, pageSize, actorId, action, fromDate, toDate])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [actorId, action, fromDate, toDate])

  async function handleClearOld() {
    const days = Number(clearDays)
    if (!Number.isFinite(days) || days < 1) {
      setError('יש להזין מספר ימים תקין')
      return
    }
    if (!confirm(`למחוק רשומות יומן ישנות מ-${days} ימים?`)) return
    setClearing(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/activity?daysOld=${days}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('שגיאה במחיקה')
      const json = await res.json()
      setSuccess(`נמחקו ${json.deleted} רשומות`)
      setPage(1)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setClearing(false)
    }
  }

  function labelFor(code: string): string {
    return ACTION_LABELS[code] ?? code
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">סינון</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">משתמש</label>
            <select
              value={actorId}
              onChange={e => setActorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">כל המשתמשים</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">סוג פעולה</label>
            <select
              value={action}
              onChange={e => setAction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">כל הפעולות</option>
              {knownActions.map(a => (
                <option key={a} value={a}>{labelFor(a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">מתאריך</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">עד תאריך</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        {(actorId || action || fromDate || toDate) && (
          <button
            type="button"
            onClick={() => { setActorId(''); setAction(''); setFromDate(''); setToDate('') }}
            className="text-xs text-brand-600 hover:text-brand-800"
          >
            ניקוי סינון
          </button>
        )}
      </div>

      {/* Status messages */}
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

      {/* Log list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-sm">
            רשומות ({total.toLocaleString('he-IL')})
            {loading && <span className="text-xs text-gray-400 mr-2">טוען...</span>}
          </h2>
        </div>

        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">אין רשומות להצגה</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-right">
                <th className="px-4 py-2.5 font-medium text-gray-600">תאריך</th>
                <th className="px-4 py-2.5 font-medium text-gray-600">משתמש</th>
                <th className="px-4 py-2.5 font-medium text-gray-600">פעולה</th>
                <th className="px-4 py-2.5 font-medium text-gray-600">תיאור</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => {
                const isOpen = expanded === log.id
                const hasDetails = log.details && Object.keys(log.details).length > 0
                return (
                  <Fragment key={log.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 tabular-nums whitespace-nowrap" dir="ltr">
                        {new Date(log.created_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {log.actor_name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs rounded px-2 py-0.5">
                          {labelFor(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{log.summary}</td>
                      <td className="px-4 py-3 text-left">
                        {hasDetails && (
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : log.id)}
                            className="text-xs text-brand-600 hover:text-brand-800"
                          >
                            {isOpen ? 'הסתר' : 'פרטים'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && hasDetails && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-gray-50">
                          <pre dir="ltr" className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">עמוד {page} מתוך {totalPages}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                הקודם
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                הבא
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cleanup */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-2">ניקוי רשומות ישנות</h2>
        <p className="text-sm text-gray-500 mb-3">
          מחק רשומות יומן ישנות מהמספר הנבחר של ימים. פעולה זו אינה ניתנת לביטול.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={clearDays}
            onChange={e => setClearDays(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-600">ימים</span>
          <button
            type="button"
            onClick={handleClearOld}
            disabled={clearing}
            className="bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {clearing ? 'מוחק...' : 'מחק רשומות ישנות'}
          </button>
        </div>
      </div>
    </div>
  )
}
