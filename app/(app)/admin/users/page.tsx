import { getAllUsers } from '@/services/auth.service'
import UserTable from '@/components/admin/UserTable'

export default async function AdminUsersPage() {
  const users = await getAllUsers()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול משתמשים</h1>
      <UserTable users={users} />
    </div>
  )
}
