import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { updateEvent, deleteEvent } from '@/services/events.service'
import { logActivity } from '@/services/activity-log.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const event = await updateEvent(id, body)
    logActivity({
      actor: admin,
      action: 'admin.event.updated',
      entityType: 'school_event',
      entityId: id,
      summary: `עדכון אירוע: ${event.title}`,
      details: { changes: body },
    })
    return NextResponse.json({ event })
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
    await deleteEvent(id)
    logActivity({
      actor: admin,
      action: 'admin.event.deleted',
      entityType: 'school_event',
      entityId: id,
      summary: `מחיקת אירוע`,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
