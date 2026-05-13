import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { restoreBackup, deleteBackup } from '@/services/backup.service'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/services/activity-log.service'

async function getBackupLabel(id: string): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('backups').select('label').eq('id', id).single()
    return data?.label ?? id
  } catch {
    return id
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const label = await getBackupLabel(id)
    await restoreBackup(id)
    logActivity({
      actor: admin,
      action: 'admin.backup.restored',
      entityType: 'backup',
      entityId: id,
      summary: `שחזור גיבוי: ${label}`,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const label = await getBackupLabel(id)
    await deleteBackup(id)
    logActivity({
      actor: admin,
      action: 'admin.backup.deleted',
      entityType: 'backup',
      entityId: id,
      summary: `מחיקת גיבוי: ${label}`,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
