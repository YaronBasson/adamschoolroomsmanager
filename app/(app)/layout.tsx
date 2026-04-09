import { redirect } from 'next/navigation'
import { getUser } from '@/services/auth.service'
import Navbar from '@/components/layout/Navbar'
import InactivityTimeout from '@/components/layout/InactivityTimeout'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUser()
  if (!profile) redirect('/login')
  if (!profile.approved) redirect('/pending')

  return (
    <div className="min-h-screen flex flex-col">
      <InactivityTimeout />
      <Navbar profile={profile} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
