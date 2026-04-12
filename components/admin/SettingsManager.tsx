'use client'

import { useState } from 'react'
import type { SchoolSettings } from '@/services/settings.service'

export default function SettingsManager({ settings }: { settings: SchoolSettings }) {
  const [form, setForm] = useState({ ...settings })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)

    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('שגיאה בשמירה')
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-lg">
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">שנת לימודים</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תחילת שנה</label>
          <input
            type="date"
            value={form.school_year_start}
            onChange={(e) => setForm((f) => ({ ...f, school_year_start: e.target.value }))}
            className={inputClass}
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סיום שנה — יסודי</label>
          <input
            type="date"
            value={form.school_year_end_primary}
            onChange={(e) => setForm((f) => ({ ...f, school_year_end_primary: e.target.value }))}
            className={inputClass}
            dir="ltr"
          />
          <p className="text-xs text-gray-400 mt-1">ברירת מחדל: 30 יוני</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סיום שנה — תיכון</label>
          <input
            type="date"
            value={form.school_year_end_secondary}
            onChange={(e) => setForm((f) => ({ ...f, school_year_end_secondary: e.target.value }))}
            className={inputClass}
            dir="ltr"
          />
          <p className="text-xs text-gray-400 mt-1">ברירת מחדל: 20 יוני</p>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-700 text-sm">נשמר בהצלחה</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
      >
        {loading ? 'שומר...' : 'שמור הגדרות'}
      </button>
    </form>
  )
}
