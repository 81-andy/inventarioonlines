import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const categorias = await db.categoria.findMany({
    include: { _count: { select: { productos: true } } },
    orderBy: { nombre: 'asc' },
  })
  return NextResponse.json({
    categorias: categorias.map((c) => ({ id: c.id, nombre: c.nombre, totalProductos: c._count.productos })),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  try {
    const { nombre } = await req.json()
    if (!nombre) return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 })
    const existe = await db.categoria.findUnique({ where: { nombre } })
    if (existe) return NextResponse.json({ error: 'Ya existe esa categoría' }, { status: 409 })
    const cat = await db.categoria.create({ data: { nombre } })
    return NextResponse.json({ categoria: cat }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
