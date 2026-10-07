import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth-middleware'
import { hashPassword } from '@/lib/auth'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin'])
  if (!auth.ok) return auth.response

  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { name, role, active, password } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (role !== undefined) data.role = role
    if (active !== undefined) data.active = active
    if (password) {
      data.passwordHash = await hashPassword(password)
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true },
    })
    return NextResponse.json({ usuario: user })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin'])
  if (!auth.ok) return auth.response

  try {
    const { id } = await ctx.params
    // No borrar físicamente: desactivar
    await db.user.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
