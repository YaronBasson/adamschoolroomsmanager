import { NextResponse } from 'next/server'
import { requireAdmin, approveUser, setUserRole, deleteUser } from '@/services/auth.service'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivity } from '@/services/activity-log.service'

async function getTargetName(id: string): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('profiles').select('full_name, email').eq('id', id).single()
    return data?.full_name ?? data?.email ?? id
  } catch {
    return id
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const targetName = await getTargetName(id)

    if (body.approved === true) {
      await approveUser(id)
      logActivity({
        actor: admin,
        action: 'admin.user.approved',
        entityType: 'user',
        entityId: id,
        summary: `אישור משתמש: ${targetName}`,
      })
    }
    if (body.role === 'user' || body.role === 'admin') {
      await setUserRole(id, body.role)
      logActivity({
        actor: admin,
        action: 'admin.user.role_changed',
        entityType: 'user',
        entityId: id,
        summary: `שינוי תפקיד של ${targetName} ל-${body.role === 'admin' ? 'מנהל' : 'משתמש'}`,
        details: { new_role: body.role },
      })
    }

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
    if (id === admin.id) {
      return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 })
    }
    const targetName = await getTargetName(id)
    await deleteUser(id)
    logActivity({
      actor: admin,
      action: 'admin.user.deleted',
      entityType: 'user',
      entityId: id,
      summary: `מחיקת משתמש: ${targetName}`,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
