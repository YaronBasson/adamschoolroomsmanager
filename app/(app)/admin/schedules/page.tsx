import { getTemplates, getAllRoomSchedules } from '@/services/schedules.service'
import { getAllRoomsAdmin } from '@/services/rooms.service'
import SchedulesManager from '@/components/admin/SchedulesManager'

export default async function AdminSchedulesPage() {
  const [templates, rooms, roomSchedules] = await Promise.all([
    getTemplates(),
    getAllRoomsAdmin(),
    getAllRoomSchedules(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">מערכות שעות</h1>
      <SchedulesManager
        templates={templates}
        rooms={rooms}
        roomSchedules={roomSchedules}
      />
    </div>
  )
}
