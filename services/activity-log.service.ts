import { createServiceClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/domain'

export interface ActivityLog {
  id: string
  created_at: string
  actor_id: string | null
  actor_name: string | null
  actor_email: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  summary: string
  details: Record<string, unknown> | null
}

export interface LogActivityInput {
  actor: Pick<Profile, 'id' | 'full_name' | 'email'> | null
  action: string
  entityType?: string | null
  entityId?: string | null
  summary: string
  details?: Record<string, unknown> | null
}

/**
 * Fire-and-forget activity log writer.
 * Never throws — logging must not interrupt the main operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = createServiceClient()
    await (supabase.from('activity_logs') as any).insert({
      actor_id: input.actor?.id ?? null,
      actor_name: input.actor?.full_name ?? null,
      actor_email: input.actor?.email ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId != null ? String(input.entityId) : null,
      summary: input.summary,
      details: input.details ?? null,
    })
  } catch (err) {
    console.error('logActivity failed', err)
  }
}

export interface ListActivityLogsParams {
  page?: number
  pageSize?: number
  actorId?: string
  action?: string
  fromDate?: string   // ISO yyyy-mm-dd (inclusive)
  toDate?: string     // ISO yyyy-mm-dd (inclusive)
}

const DEFAULT_PAGE_SIZE = 50

export async function listActivityLogs(
  params: ListActivityLogsParams = {}
): Promise<{ logs: ActivityLog[]; total: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), 200)
  const page = Math.max(params.page ?? 1, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = createServiceClient()
  let query = (supabase.from('activity_logs') as any)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.actorId) query = query.eq('actor_id', params.actorId)
  if (params.action) query = query.eq('action', params.action)
  if (params.fromDate) {
    query = query.gte('created_at', new Date(`${params.fromDate}T00:00:00+03:00`).toISOString())
  }
  if (params.toDate) {
    query = query.lte('created_at', new Date(`${params.toDate}T23:59:59+03:00`).toISOString())
  }

  const { data, error, count } = await query
  if (error) throw error
  return {
    logs: (data ?? []) as ActivityLog[],
    total: count ?? 0,
    pageSize,
  }
}

/** Bulk-delete logs older than the given number of days. Returns deleted count. */
export async function clearOldLogs(daysOld: number): Promise<number> {
  if (!Number.isFinite(daysOld) || daysOld < 1) throw new Error('Invalid daysOld')
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString()
  const supabase = createServiceClient()
  const { data, error } = await (supabase.from('activity_logs') as any)
    .delete()
    .lt('created_at', cutoff)
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

/** Distinct list of action codes currently in the log table — used to populate the filter dropdown. */
export async function getDistinctActions(): Promise<string[]> {
  const supabase = createServiceClient()
  const { data, error } = await (supabase.from('activity_logs') as any)
    .select('action')
    .order('action', { ascending: true })
  if (error) throw error
  const set = new Set<string>()
  for (const row of (data ?? []) as { action: string }[]) set.add(row.action)
  return [...set]
}
