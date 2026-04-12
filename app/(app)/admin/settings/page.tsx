import { getSchoolSettings } from '@/services/settings.service'
import SettingsManager from '@/components/admin/SettingsManager'

export default async function AdminSettingsPage() {
  const settings = await getSchoolSettings()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">הגדרות מערכת</h1>
      <SettingsManager settings={settings} />
    </div>
  )
}
