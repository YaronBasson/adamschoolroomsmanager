import { NextResponse } from 'next/server'
import { requireAdmin, approveUser, setUserRole, deleteUser } from '@/services/auth.service'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    if (body.approved === true) {
      await approveUser(id)
    }
    if (body.role === 'user' || body.role === 'admin') {
      await setUserRole(id, body.role)
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
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
