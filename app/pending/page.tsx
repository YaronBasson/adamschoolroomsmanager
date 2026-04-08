'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">ממתין לאישור</h1>
        <p className="text-gray-600 mb-2">
          ההרשמה שלך התקבלה בהצלחה.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          מנהל המערכת יאשר את חשבונך בקרוב. תוכל/י לגשת למערכת לאחר האישור.
        </p>

        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          יציאה
        </button>
      </div>
    </div>
  )
}
