import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { createRoom } from '@/services/rooms.service'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const room = await createRoom(body)
    return NextResponse.json({ room }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
