import { redirect } from 'next/navigation'
import { getUser } from '@/services/auth.service'

export default async function Home() {
  const user = await getUser()
  if (!user) redirect('/login')
  if (!user.approved) redirect('/pending')
  redirect('/rooms')
}
