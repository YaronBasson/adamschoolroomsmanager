import { listBackups } from '@/services/backup.service'
import BackupManager from '@/components/admin/BackupManager'

export default async function AdminBackupsPage() {
  const backups = await listBackups()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">גיבוי ושחזור</h1>
      <BackupManager backups={backups} />
    </div>
  )
}
