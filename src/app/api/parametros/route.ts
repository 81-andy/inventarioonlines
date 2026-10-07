import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  const params = await db.parametro.findMany()
  return NextResponse.json({ parametros: params })
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(req, ['admin'])
  if (!auth.ok) return auth.response

  try {
    const { clave, valor } = await req.json()
    if (!clave) return NextResponse.json({ error: 'Clave obligatoria' }, { status: 400 })
    const param = await db.parametro.upsert({
      where: { clave },
      update: { valor: String(valor) },
      create: { clave, valor: String(valor) },
    })
    return NextResponse.json({ parametro: param })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
