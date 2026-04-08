import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/types/domain'

export async function getUser(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data ?? null
}

export async function requireApprovedUser(): Promise<Profile> {
  const profile = await getUser()
  if (!profile) throw new Error('UNAUTHENTICATED')
  if (!profile.approved) throw new Error('PENDING_APPROVAL')
  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireApprovedUser()
  if (profile.role !== 'admin') throw new Error('FORBIDDEN')
  return profile
}

export async function approveUser(userId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ approved: true })
    .eq('id', userId)
  if (error) throw error
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
  if (error) throw error
}

export async function getPendingUsers(): Promise<Profile[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('approved', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getAllUsers(): Promise<Profile[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
