import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth-middleware'
import { recalcularAlertas } from '@/lib/alertas'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['admin', 'operador'])
  if (!auth.ok) return auth.response

  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { nombre, descripcion, categoriaId, unidadMedida, stockMinimo } = body

    const data: Record<string, unknown> = {}
    if (nombre !== undefined) data.nombre = nombre
    if (descripcion !== undefined) data.descripcion = descripcion
    if (categoriaId !== undefined) data.categoriaId = categoriaId || null
    if (unidadMedida !== undefined) data.unidadMedida = unidadMedida
    if (stockMinimo !== undefined) data.stockMinimo = Number(stockMinimo)

    const producto = await db.producto.update({
      where: { id },
      data,
      include: { categoria: true },
    })

    await recalcularAlertas()
    return NextResponse.json({ producto })
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
    await db.producto.delete({ where: { id } })
    await recalcularAlertas()
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
