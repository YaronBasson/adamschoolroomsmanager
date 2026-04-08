import { redirect } from 'next/navigation'
import { getUser } from '@/services/auth.service'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUser()
  if (!profile || profile.role !== 'admin') redirect('/rooms')

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 pb-4">
        <Link
          href="/admin/users"
          className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          ניהול משתמשים
        </Link>
        <Link
          href="/admin/rooms"
          className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          ניהול חדרים
        </Link>
        <Link
          href="/admin/reasons"
          className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          ניהול סיבות הזמנה
        </Link>
      </div>
      {children}
    </div>
  )
}
