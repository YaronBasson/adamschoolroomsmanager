import { createClient } from '@/lib/supabase/server'
import ReasonManager from '@/components/admin/ReasonManager'
import type { BookingReason } from '@/types/domain'

export default async function AdminReasonsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('booking_reasons')
    .select('*')
    .order('name')
  const reasons = (data ?? []) as BookingReason[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול סיבות הזמנה</h1>
      <ReasonManager reasons={reasons} />
    </div>
  )
}
