import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { createRoom } from '@/services/rooms.service'
import { logActivity } from '@/services/activity-log.service'

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const room = await createRoom(body)
    logActivity({
      actor: admin,
      action: 'admin.room.created',
      entityType: 'room',
      entityId: room.id,
      summary: `יצירת חדר: ${room.room_number}${room.name ? ` (${room.name})` : ''}`,
      details: room as unknown as Record<string, unknown>,
    })
    return NextResponse.json({ room }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
