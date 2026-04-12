import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { getAllRoomSchedules, setRoomTemplate } from '@/services/schedules.service'

export async function GET() {
  try {
    await requireAdmin()
    const schedules = await getAllRoomSchedules()
    return NextResponse.json({ schedules })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { room_id, template_id } = await request.json()
    if (!room_id || !template_id) {
      return NextResponse.json({ error: 'room_id and template_id required' }, { status: 400 })
    }
    await setRoomTemplate(room_id, template_id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
