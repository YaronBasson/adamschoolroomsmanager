import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { clearRoomSchedule, setRoomCustomPeriods } from '@/services/schedules.service'
import { logActivity } from '@/services/activity-log.service'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { roomId } = await params
    await clearRoomSchedule(roomId)
    logActivity({
      actor: admin,
      action: 'admin.schedule.cleared',
      entityType: 'room_schedule',
      entityId: roomId,
      summary: `הסרת מערכת שעות מחדר`,
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { roomId } = await params
    const { template_id, custom_periods } = await request.json()
    if (!Array.isArray(custom_periods)) {
      return NextResponse.json({ error: 'custom_periods must be an array' }, { status: 400 })
    }
    await setRoomCustomPeriods(roomId, template_id ?? null, custom_periods)
    logActivity({
      actor: admin,
      action: 'admin.schedule.customized',
      entityType: 'room_schedule',
      entityId: roomId,
      summary: `התאמה אישית של מערכת השעות לחדר`,
      details: { template_id: template_id ?? null, custom_periods_count: custom_periods.length },
    })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
