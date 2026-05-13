import { listActivityLogs, getDistinctActions } from '@/services/activity-log.service'
import { getAllUsers } from '@/services/auth.service'
import ActivityLogViewer from '@/components/admin/ActivityLogViewer'

export default async function AdminActivityPage() {
  // Gracefully handle the case where the migration hasn't been run yet —
  // show an empty state instead of crashing the page.
  const [initialResult, actionsResult, users] = await Promise.all([
    listActivityLogs({ page: 1 }).catch(() => ({ logs: [], total: 0, pageSize: 50 })),
    getDistinctActions().catch(() => [] as string[]),
    getAllUsers(),
  ])
  const initial = initialResult
  const actions = actionsResult

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">יומן פעילות</h1>
      <ActivityLogViewer
        initialLogs={initial.logs}
        initialTotal={initial.total}
        pageSize={initial.pageSize}
        knownActions={actions}
        users={users.map(u => ({ id: u.id, full_name: u.full_name, email: u.email }))}
      />
    </div>
  )
}
