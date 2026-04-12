'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/domain'

interface UserTableProps {
  users: Profile[]
}

export default function UserTable({ users }: UserTableProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleDelete(user: Profile) {
    if (!confirm(`למחוק את ${user.full_name || user.email}? לא ניתן לבטל פעולה זו.`)) return
    setLoadingId(user.id)
    await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    setLoadingId(null)
    router.refresh()
  }

  async function handleApprove(userId: string) {
    setLoadingId(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    })
    setLoadingId(null)
    router.refresh()
  }

  async function handleSetRole(userId: string, role: 'user' | 'admin') {
    setLoadingId(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setLoadingId(null)
    router.refresh()
  }

  const pending = users.filter((u) => !u.approved)
  const approved = users.filter((u) => u.approved)

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-orange-700 mb-3">
            ממתינים לאישור ({pending.length})
          </h2>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">שם</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">אימייל</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">תאריך הרשמה</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('he-IL')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(u.id)} disabled={loadingId === u.id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                          {loadingId === u.id ? '...' : 'אשר'}
                        </button>
                        <button onClick={() => handleDelete(u)} disabled={loadingId === u.id}
                          className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                          מחק
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {pending.map((u) => (
              <div key={u.id} className="bg-white border border-orange-200 rounded-xl p-4">
                <p className="font-semibold text-gray-900">{u.full_name || '—'}</p>
                <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(u.created_at).toLocaleDateString('he-IL')}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleApprove(u.id)} disabled={loadingId === u.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                    {loadingId === u.id ? '...' : 'אשר'}
                  </button>
                  <button onClick={() => handleDelete(u)} disabled={loadingId === u.id}
                    className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 text-sm font-medium py-2 rounded-lg transition-colors">
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          משתמשים מאושרים ({approved.length})
        </h2>
        {/* Desktop table */}
        <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-700">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">אימייל</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">תפקיד</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approved.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.full_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {u.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <select value={u.role} onChange={(e) => handleSetRole(u.id, e.target.value as 'user' | 'admin')}
                        disabled={loadingId === u.id}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50">
                        <option value="user">משתמש</option>
                        <option value="admin">מנהל</option>
                      </select>
                      <button onClick={() => handleDelete(u)} disabled={loadingId === u.id}
                        className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {approved.map((u) => (
            <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{u.full_name || '—'}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                  {u.role === 'admin' ? 'מנהל' : 'משתמש'}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <label className="text-xs text-gray-500 block mb-1">שינוי תפקיד</label>
                <select value={u.role} onChange={(e) => handleSetRole(u.id, e.target.value as 'user' | 'admin')}
                  disabled={loadingId === u.id}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50">
                  <option value="user">משתמש</option>
                  <option value="admin">מנהל</option>
                </select>
                <button onClick={() => handleDelete(u)} disabled={loadingId === u.id}
                  className="w-full bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 border border-red-200 text-sm font-medium py-2 rounded-lg transition-colors">
                  מחק משתמש
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
