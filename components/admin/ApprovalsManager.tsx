'use client'

import { useState } from 'react'
import type { RecurringRequest } from '@/services/recurring.service'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export default function ApprovalsManager({ requests: initial }: { requests: RecurringRequest[] }) {
  const [requests, setRequests] = useState(initial)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})

  async function handleApprove(id: string) {
    setProcessing(id)
    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessages(prev => ({ ...prev, [id]: `אושר — נוצרו ${data.created} הזמנות${data.skipped > 0 ? `, דולגו ${data.skipped} (התנגשות)` : ''}` }))
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      setMessages(prev => ({ ...prev, [id]: `שגיאה: ${err instanceof Error ? err.message : 'unknown'}` }))
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(id: string) {
    setProcessing(id)
    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject', admin_note: rejectNote }),
      })
      if (!res.ok) throw new Error('שגיאה')
      setRequests(prev => prev.filter(r => r.id !== id))
      setRejectingId(null)
      setRejectNote('')
    } catch (err) {
      setMessages(prev => ({ ...prev, [id]: err instanceof Error ? err.message : 'שגיאה' }))
    } finally {
      setProcessing(null)
    }
  }

  if (requests.length === 0 && Object.keys(messages).length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        אין בקשות הזמנה חוזרת ממתינות לאישור
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Result messages from processed requests */}
      {Object.entries(messages).map(([id, msg]) => (
        <div key={id} className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-lg">
          {msg}
        </div>
      ))}

      {requests.map(req => {
        const room = req.room as { room_number: string; name?: string; floor?: number } | undefined
        const user = req.user as { full_name: string; email: string } | undefined

        return (
          <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{user?.full_name ?? 'משתמש'}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{req.school_type}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">חדר {room?.room_number ?? '—'}</span>
                  {room?.name ? ` — ${room.name}` : ''}
                  {room?.floor != null ? `, קומה ${room.floor}` : ''}
                </div>
                <div className="text-sm text-gray-600">
                  כל יום <span className="font-medium">{DAY_NAMES[req.day_of_week]}</span>{' '}
                  · שעות {req.start_period}–{req.end_period}
                </div>
                <div className="text-xs text-gray-400">
                  מ-{new Date(req.start_date).toLocaleDateString('he-IL')}
                  {req.end_date ? ` עד ${new Date(req.end_date).toLocaleDateString('he-IL')}` : ' עד סוף השנה'}
                </div>
                {req.reason_text && (
                  <div className="text-xs text-gray-500">סיבה: {req.reason_text}</div>
                )}
                <div className="text-xs text-gray-400">
                  הוגש: {new Date(req.created_at).toLocaleDateString('he-IL')}
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                {rejectingId !== req.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(req.id)}
                      disabled={processing === req.id}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {processing === req.id ? '...' : 'אשר'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(req.id)}
                      disabled={processing === req.id}
                      className="border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      דחה
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 w-48">
                    <input
                      type="text"
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      placeholder="הערה (אופציונלי)"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleReject(req.id)}
                        disabled={processing === req.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-2 py-1.5 rounded-lg transition-colors"
                      >
                        {processing === req.id ? '...' : 'אשר דחייה'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectingId(null); setRejectNote('') }}
                        className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
