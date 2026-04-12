import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { getAllEvents, createEvent } from '@/services/events.service'

export async function GET() {
  try {
    await requireAdmin()
    const events = await getAllEvents()
    return NextResponse.json({ events })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    const event = await createEvent(body, admin.id)
    return NextResponse.json({ event })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
