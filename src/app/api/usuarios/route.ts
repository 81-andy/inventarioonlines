import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth-middleware'
import { hashPassword } from '@/lib/auth'

// GET /api/usuarios -> lista usuarios (admin)
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if (!auth.ok) return auth.response

  const usuarios = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ usuarios })
}

// POST /api/usuarios -> crear usuario (admin)
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if (!auth.ok) return auth.response

  try {
    const { email, name, password, role } = await req.json()
    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    if (!['admin', 'operador', 'supervisor'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const existe = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existe) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }

    const hash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        passwordHash: hash,
        role,
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    })
    return NextResponse.json({ usuario: user }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
