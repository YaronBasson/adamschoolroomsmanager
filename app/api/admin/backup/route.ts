import { NextResponse } from 'next/server'
import { requireAdmin } from '@/services/auth.service'
import { listBackups, createBackup } from '@/services/backup.service'

export async function GET() {
  try {
    await requireAdmin()
    const backups = await listBackups()
    return NextResponse.json({ backups })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const { label } = await request.json()
    if (!label?.trim()) return NextResponse.json({ error: 'Label required' }, { status: 400 })
    const backup = await createBackup(label.trim(), admin.id)
    return NextResponse.json({ backup })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
