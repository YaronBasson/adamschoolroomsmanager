'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BookingReason } from '@/types/domain'

interface ReasonManagerProps {
  reasons: BookingReason[]
}

export default function ReasonManager({ reasons }: ReasonManagerProps) {
  const router = useRouter()
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/admin/reasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    setNewName('')
    setLoading(false)
    router.refresh()
  }

  async function handleToggle(reason: BookingReason) {
    setTogglingId(reason.id)
    await fetch(`/api/admin/reasons/${reason.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !reason.is_active }),
    })
    setTogglingId(null)
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          placeholder="שם הסיבה..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          {loading ? '...' : 'הוסף סיבה'}
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {reasons.map((reason) => (
          <div key={reason.id} className="flex items-center justify-between px-4 py-3">
            <span className={`text-sm ${!reason.is_active ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {reason.name}
            </span>
            <button
              onClick={() => handleToggle(reason)}
              disabled={togglingId === reason.id}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2 py-1 rounded-md disabled:opacity-50 transition-colors"
            >
              {reason.is_active ? 'השבת' : 'הפעל'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
