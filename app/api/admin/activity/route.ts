import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { listActivityLogs, clearOldLogs } from '@/services/activity-log.service'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '50')
    const actorId = url.searchParams.get('actorId') ?? undefined
    const action = url.searchParams.get('action') ?? undefined
    const fromDate = url.searchParams.get('fromDate') ?? undefined
    const toDate = url.searchParams.get('toDate') ?? undefined

    const result = await listActivityLogs({ page, pageSize, actorId, action, fromDate, toDate })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin()
    const url = new URL(request.url)
    const days = Number(url.searchParams.get('daysOld') ?? '90')
    if (!Number.isFinite(days) || days < 1) {
      return NextResponse.json({ error: 'Invalid daysOld' }, { status: 400 })
    }
    const deleted = await clearOldLogs(days)
    return NextResponse.json({ deleted })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
