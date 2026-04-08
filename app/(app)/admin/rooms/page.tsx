import { getAllRoomsAdmin } from '@/services/rooms.service'
import RoomManager from '@/components/admin/RoomManager'

export default async function AdminRoomsPage() {
  const rooms = await getAllRoomsAdmin()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול חדרים</h1>
      <RoomManager rooms={rooms} />
    </div>
  )
}
