import { createServiceClient } from '@/lib/supabase/server'

type BackupData = Record<string, unknown[]>

export interface BackupRecord {
  id: string
  created_at: string
  created_by: string | null
  label: string
  creator?: { full_name: string; email: string } | null
}

// Tables backed up (including future module tables — gracefully handles missing ones)
const BACKUP_TABLES = [
  'school_settings',
  'rooms',
  'booking_reasons',
  'schedule_templates',
  'room_schedules',
  'profiles',
  'bookings',
  'switch_requests',
  'recurring_booking_requests',
  'school_events',
] as const

// Restore order: delete children first, then re-insert parents first
// Profiles excluded — managed by Supabase Auth
const DELETE_ORDER = [
  'switch_requests',
  'school_events',
  'recurring_booking_requests',
  'bookings',
  'room_schedules',
  'schedule_templates',
  'booking_reasons',
  'rooms',
  'school_settings',
]

const INSERT_ORDER = [
  'school_settings',
  'rooms',
  'booking_reasons',
  'schedule_templates',
  'room_schedules',
  'bookings',
  'recurring_booking_requests',
  'school_events',
  'switch_requests',
]

// PK column per table (for delete-all filter)
const TABLE_PK: Record<string, string> = {
  school_settings: 'key',
  room_schedules: 'room_id',
}

async function deleteAll(supabase: ReturnType<typeof createServiceClient>, table: string) {
  const pk = TABLE_PK[table] ?? 'id'
  // `not(pk, 'is', null)` matches all rows since PKs are always NOT NULL
  await (supabase.from(table) as any).delete().not(pk, 'is', null)
}

export async function listBackups(): Promise<BackupRecord[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('backups')
    .select('id, created_at, created_by, label, creator:profiles(full_name, email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as BackupRecord[]
}

export async function createBackup(label: string, userId: string): Promise<BackupRecord> {
  const supabase = createServiceClient()
  const snapshot: BackupData = {}

  for (const table of BACKUP_TABLES) {
    try {
      const { data } = await (supabase.from(table) as any).select('*')
      snapshot[table] = data ?? []
    } catch {
      snapshot[table] = []
    }
  }

  const { data, error } = await supabase
    .from('backups')
    .insert({ label, created_by: userId, data: snapshot })
    .select('id, created_at, created_by, label, creator:profiles(full_name, email)')
    .single()
  if (error) throw error
  return data as BackupRecord
}

export async function restoreBackup(backupId: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: backup, error } = await supabase
    .from('backups')
    .select('data')
    .eq('id', backupId)
    .single()
  if (error || !backup) throw new Error('Backup not found')

  const snapshot = backup.data as BackupData

  // Delete in dependency order (children first)
  for (const table of DELETE_ORDER) {
    try {
      await deleteAll(supabase, table)
    } catch { /* table may not exist yet */ }
  }

  // Insert in dependency order (parents first)
  for (const table of INSERT_ORDER) {
    const rows = snapshot[table]
    if (!rows || rows.length === 0) continue
    try {
      // Insert in batches of 500 to avoid payload limits
      for (let i = 0; i < rows.length; i += 500) {
        await (supabase.from(table) as any).insert(rows.slice(i, i + 500))
      }
    } catch { /* ignore — table may not exist or FK issue */ }
  }
}

export async function deleteBackup(backupId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('backups').delete().eq('id', backupId)
  if (error) throw error
}
