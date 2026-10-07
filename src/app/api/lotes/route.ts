import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { recalcularAlertas } from '@/lib/alertas'

// GET /api/lotes -> lista lotes
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const productoId = url.searchParams.get('productoId')

  const where: Record<string, unknown> = {}
  if (productoId) where.productoId = productoId

  const lotes = await db.lote.findMany({
    where,
    include: { producto: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ lotes })
}

// POST /api/lotes -> crear lote (entrada inicial)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return auth.response
  // Operador y admin pueden registrar lotes
  if (auth.user.role === 'supervisor') {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { productoId, numeroLote, cantidadInicial, fechaVencimiento } = body

    if (!productoId || !numeroLote || !cantidadInicial || !fechaVencimiento) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const cant = Number(cantidadInicial)
    if (cant <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 })
    }

    const fV = new Date(fechaVencimiento)
    if (fV < new Date()) {
      return NextResponse.json({ error: 'La fecha de vencimiento no puede ser anterior a hoy' }, { status: 400 })
    }

    // Verifica unicidad del lote para el producto
    const existente = await db.lote.findUnique({
      where: { productoId_numeroLote: { productoId, numeroLote } },
    })
    if (existente) {
      return NextResponse.json({ error: 'Ya existe un lote con ese número para el producto' }, { status: 409 })
    }

    // Crea lote y registra movimiento de entrada en transacción
    const lote = await db.$transaction(async (tx) => {
      const l = await tx.lote.create({
        data: {
          productoId,
          numeroLote,
          cantidadInicial: cant,
          cantidadActual: cant,
          fechaVencimiento: fV,
        },
      })

      const producto = await tx.producto.update({
        where: { id: productoId },
        data: { stockActual: { increment: cant } },
      })

      await tx.movimiento.create({
        data: {
          loteId: l.id,
          productoId,
          tipo: 'entrada',
          cantidad: cant,
          motivo: 'Alta de lote',
          usuarioId: auth.user.userId,
        },
      })

      return { lote: l, producto }
    })

    await recalcularAlertas()
    return NextResponse.json({ lote: lote.lote }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
