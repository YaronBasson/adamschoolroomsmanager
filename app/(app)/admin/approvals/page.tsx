import { getPendingRequests } from '@/services/recurring.service'
import ApprovalsManager from '@/components/admin/ApprovalsManager'

export default async function AdminApprovalsPage() {
  const requests = await getPendingRequests()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">אישור הזמנות חוזרות</h1>
      <p className="text-sm text-gray-500 mb-6">
        הזמנות חוזרות מאושרות יצרו אוטומטית הזמנות שבועיות עד סוף שנת הלימודים.
      </p>
      <ApprovalsManager requests={requests} />
    </div>
  )
}
